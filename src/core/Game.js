import { GAME_CONFIG, IMPACT_CONFIG, PLAYER_BASE_STATS, SONIC_WAVE_CONFIG } from "../config/game-config.js";
import { LEVEL_CONFIG, getLevelConfig } from "../config/level-config.js";
import { createBossDefinition, getEnemyById } from "../config/enemy-config.js";
import { ModuleSystem } from "../systems/ModuleSystem.js";
import { WeaponSystem } from "../systems/WeaponSystem.js";
import { SkillSystem } from "../systems/SkillSystem.js";
import { EnemySpawner } from "../systems/EnemySpawner.js";
import { CollisionSystem } from "../systems/CollisionSystem.js";
import { SoundSystem } from "../systems/SoundSystem.js";
import { Player } from "../entities/Player.js";
import { Wingman } from "../entities/Wingman.js";
import { Decoy } from "../entities/Decoy.js";
import { Enemy } from "../entities/Enemy.js";

export class Game {
  constructor({ canvas, input, ui }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = input;
    this.ui = ui;
    this.bounds = GAME_CONFIG.canvas;
    this.moduleSystem = new ModuleSystem();
    this.weaponSystem = new WeaponSystem();
    this.collisionSystem = new CollisionSystem();
    this.sound = new SoundSystem();
    this.animationFrame = null;
    this.state = "menu";
    this.elapsed = 0;
    this.score = 0;
    this.enemies = [];
    this.projectiles = [];
    this.explosions = [];
    this.lasers = [];
    this.decoys = [];
    this.wingman = null;
    this.freezeTimer = 0;
    this.ionSaw = { active: false, damage: 1, damageTimer: 0 };
    this.sonicWaves = [];
    this.damageNumbers = [];
    this.damageNumbersEnabled = true;
    this.vibrationEnabled = true;
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeStrength = 0;
    this.stars = Array.from({ length: GAME_CONFIG.stars.count }, () => ({
      x: Math.random() * this.bounds.width, y: Math.random() * this.bounds.height,
      size: 0.6 + Math.random() * 1.8, speed: GAME_CONFIG.stars.speedMin + Math.random() * (GAME_CONFIG.stars.speedMax - GAME_CONFIG.stars.speedMin),
      alpha: 0.25 + Math.random() * 0.65,
    }));
    this.ui.bind({ onStart: (spec) => this.start(spec), onMenu: () => this.toMenu(), onPause: () => this.pause(), onResume: () => this.resume(), onSkill: (index) => this.activateSkill(index), onDamageNumbersChanged: (enabled) => { this.damageNumbersEnabled = enabled; if (!enabled) this.damageNumbers = []; }, onVibrationChanged: (enabled) => { this.vibrationEnabled = enabled; }, onSoundChanged: (enabled) => this.sound.setEnabled(enabled), onNextLevel: () => this.start({ ...this.ui.getSelectedIds(), mode: "levels", level: Math.min(25, this.levelNumber + 1) }), onLevelSelect: () => this.toLevelSelect(), onModeSelect: () => this.toModeSelect() });
    this.input.setSkillHandler((index) => this.activateSkill(index));
    this.render();
  }

  start(spec) {
    this.stopLoop();
    this.sound.unlock();
    const loadout = this.moduleSystem.install(spec);
    const stats = this.moduleSystem.calculateStats(PLAYER_BASE_STATS, loadout);
    this.player = new Player({ x: this.bounds.width / 2, y: this.bounds.height - 92, stats, loadout });
    this.skillSystem = new SkillSystem(loadout);
    this.mode = spec?.mode ?? "endless";
    this.levelNumber = Number(spec?.level ?? 1);
    this.levelConfig = this.mode === "levels" ? getLevelConfig(this.levelNumber) : null;
    const spawnerConfig = this.levelConfig
      ? { fixed: true, spawnInterval: this.levelConfig.spawnInterval, minimumSpawnInterval: this.levelConfig.minimumSpawnInterval, speedMultiplier: this.levelConfig.speedMultiplier, hpMultiplier: this.levelConfig.hpMultiplier }
      : { ...LEVEL_CONFIG.difficulty, hpMultiplierStep: LEVEL_CONFIG.difficulty.hpMultiplierStep ?? 0.06 };
    this.spawner = new EnemySpawner({ width: this.bounds.width, config: spawnerConfig, pool: this.levelConfig?.enemyPool });
    this.enemies = [];
    this.projectiles = [];
    this.explosions = [];
    this.lasers = [];
    this.decoys = [];
    this.wingman = loadout.modules.some(({ module }) => module?.id === "special-wingman") ? new Wingman(this.player) : null;
    this.freezeTimer = 0;
    this.ionSaw = { active: false, damage: 1, damageTimer: 0 };
    this.sonicWaves = [];
    this.damageNumbers = [];
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeStrength = 0;
    this.elapsed = 0;
    this.score = 0;
    this.bossSpawned = false;
    this.boss = null;
    this.bossSummonTimer = 0;
    this.bossSummonCount = 0;
    this.state = "playing";
    this.ui.showPlaying({ hp: this.player.hp, maxHp: this.player.stats.maxHp, score: 0, elapsed: 0, skills: this.skillSystem.getState(), level: this.levelConfig?.number ?? null, goal: this.levelConfig?.targetScore ?? null, boss: false });
    this.lastFrame = performance.now();
    this.animationFrame = requestAnimationFrame((time) => this.frame(time));
  }

  stopLoop() { if (this.animationFrame) cancelAnimationFrame(this.animationFrame); this.animationFrame = null; }

  toMenu() { this.stopLoop(); this.state = "menu"; this.ui.showMenu(); this.render(); }
  toLevelSelect() { this.stopLoop(); this.state = "menu"; this.ui.showLevelSelect(); this.render(); }
  toModeSelect() { this.stopLoop(); this.state = "menu"; this.ui.showModeSelect(); this.render(); }
  pause() { if (this.state !== "playing") return; this.state = "paused"; this.stopLoop(); this.ui.showPause(); }
  resume() { if (this.state !== "paused") return; this.state = "playing"; this.ui.hidePause(); this.lastFrame = performance.now(); this.animationFrame = requestAnimationFrame((time) => this.frame(time)); }
  triggerShake(kind = "hit") {
    const impact = IMPACT_CONFIG[kind] ?? IMPACT_CONFIG.hit;
    this.shakeTime = Math.max(this.shakeTime, impact.duration);
    this.shakeDuration = Math.max(this.shakeDuration, impact.duration);
    this.shakeStrength = Math.max(this.shakeStrength, impact.strength);
    if (this.vibrationEnabled && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(impact.vibration);
  }

  activateSkill(index) { const activated = this.skillSystem?.activate(index, this); if (activated) this.sound.play("skill"); return activated; }
  createDecoy(duration) { this.decoys.push(new Decoy(this.player, duration)); }
  startIonSaw(duration) { this.ionSaw.active = true; this.ionSaw.duration = Math.max(this.ionSaw.duration ?? 0, duration); this.ionSaw.damageTimer = 0; }
  startSonicWave(duration) { this.sonicWaves.push({ duration, spawnTimer: 0, nextY: this.player.y, step: SONIC_WAVE_CONFIG.spawnStep }); }

  updateBossSummons(dt) {
    const summon = this.boss?.definition?.summon;
    if (!summon) return [];
    this.bossSummonTimer -= dt;
    if (this.bossSummonTimer > 0) return [];
    const activeMinions = this.enemies.filter((enemy) => !enemy.boss && enemy.hp > 0).length;
    const availableSlots = Math.max(0, summon.maxActive - activeMinions);
    if (availableSlots === 0) { this.bossSummonTimer = 0.65; return []; }
    this.bossSummonTimer = summon.interval;
    const amount = Math.min(summon.count, availableSlots);
    const spawned = [];
    for (let index = 0; index < amount; index += 1) {
      const enemyId = summon.pool[(this.bossSummonCount + index) % summon.pool.length];
      const definition = getEnemyById(enemyId);
      if (!definition) continue;
      const side = index % 2 === 0 ? -1 : 1;
      const x = Math.max(definition.radius + 4, Math.min(this.bounds.width - definition.radius - 4, this.boss.x + side * (58 + index * 16)));
      spawned.push(new Enemy(definition, x, { level: this.levelNumber, spawnY: this.boss.y + 10 + index * 8, summoned: true, hpMultiplier: this.levelConfig?.hpMultiplier ?? 1, speedMultiplier: this.levelConfig?.speedMultiplier ?? 1 }));
    }
    this.bossSummonCount += spawned.length;
    return spawned;
  }

  frame(time) {
    if (this.state !== "playing") return;
    const dt = Math.min(0.034, Math.max(0.001, (time - this.lastFrame) / 1000));
    this.lastFrame = time;
    this.update(dt);
    this.render();
    if (this.state === "playing") this.animationFrame = requestAnimationFrame((next) => this.frame(next));
  }

  updateSonicWave(dt) {
    const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
    const topBoundary = -SONIC_WAVE_CONFIG.beamThickness;

    for (const wave of this.sonicWaves) {
      wave.spawnTimer -= safeDt;
      while (wave.spawnTimer <= 0 && Number.isFinite(wave.nextY) && wave.nextY > topBoundary) {
        this.lasers.push({
          y: wave.nextY,
          life: SONIC_WAVE_CONFIG.beamLife,
          visualLife: SONIC_WAVE_CONFIG.beamVisualLife,
          age: 0,
          thickness: SONIC_WAVE_CONFIG.beamThickness,
          damage: SONIC_WAVE_CONFIG.damage,
          hitIds: new Set(),
        });
        wave.nextY -= wave.step;
        wave.spawnTimer += SONIC_WAVE_CONFIG.spawnInterval;
      }
      // Mark the sequence finished as soon as its next beam would be above the canvas.
      wave.finished = !Number.isFinite(wave.nextY) || wave.nextY <= topBoundary;
    }
    this.sonicWaves = this.sonicWaves.filter((wave) => !wave.finished);

    // Keep damage and visual lifetimes separate: the beam can leave a short afterglow
    // without causing a second hit, while invalid top-edge beams are still removed.
    for (const laser of this.lasers) {
      laser.age += safeDt;
      laser.life = Math.max(0, laser.life - safeDt);
      laser.visualLife = Math.max(0, laser.visualLife - safeDt);
    }
    this.lasers = this.lasers.filter((laser) => Number.isFinite(laser.visualLife) && laser.visualLife > 0);
  }

  updateDamageNumbers(dt) { for (const number of this.damageNumbers) { number.age += dt; number.y -= 22 * dt; } this.damageNumbers = this.damageNumbers.filter((number) => number.age < number.life); }
  updateExplosions(dt) { for (const explosion of this.explosions) explosion.life -= dt; this.explosions = this.explosions.filter((explosion) => explosion.life > 0); }

  update(dt) {
    this.elapsed += dt;
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.skillSystem.update(dt);
    this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    this.ionSaw.duration = Math.max(0, (this.ionSaw.duration ?? 0) - dt);
    this.ionSaw.active = this.ionSaw.duration > 0;
    this.ionSaw.damageTimer -= dt;
    this.updateSonicWave(dt);
    this.player.update(dt, this.input, this.bounds);
    const playerShots = this.weaponSystem.firePlayer(this.player, this.enemies);
    if (playerShots.length) this.sound.play("shot");
    this.projectiles.push(...playerShots);
    for (const decoy of this.decoys) { decoy.update(dt); if (decoy.alive) this.projectiles.push(...this.weaponSystem.firePlayer(decoy, this.enemies, { damageMultiplier: decoy.damageMultiplier })); }
    this.decoys = this.decoys.filter((decoy) => decoy.alive);
    if (this.wingman) { this.wingman.update(dt, this.player, this.bounds); const shot = this.wingman.fire(); if (shot) this.projectiles.push(shot); }

    if (this.levelConfig?.boss && !this.bossSpawned && this.score >= this.levelConfig.targetScore) {
      this.bossSpawned = true;
      this.boss = new Enemy(createBossDefinition(this.levelNumber), this.bounds.width / 2, { level: this.levelNumber });
      this.enemies = [this.boss];
      this.bossSummonTimer = 1.2;
      this.bossSummonCount = 0;
    } else if (!this.bossSpawned) {
      const enemy = this.spawner.update(dt, this.elapsed);
      if (enemy) this.enemies.push(enemy);
    }
    if (this.bossSpawned && this.boss && this.boss.hp > 0) this.enemies.push(...this.updateBossSummons(dt));
    for (const current of this.enemies) {
      current.frozen = this.freezeTimer > 0 && !current.definition.boss;
      current.update(dt, this.bounds);
      if (current.canShoot()) {
        const shots = this.weaponSystem.fireEnemy(current, this.player);
        this.projectiles.push(...(Array.isArray(shots) ? shots : [shots]));
      }
    }
    for (const projectile of this.projectiles) {
      if (this.freezeTimer > 0 && projectile.team === "enemy") continue;
      projectile.update(dt, this.enemies, this.bounds);
    }

    const collision = this.collisionSystem.resolve({ player: this.player, enemies: this.enemies, projectiles: this.projectiles, wingman: this.wingman, lasers: this.lasers, freezeActive: this.freezeTimer > 0, ionSaw: this.ionSaw });
    if (collision.sawTriggered) this.ionSaw.damageTimer = 1 / 6;
    this.score += collision.score;
    this.explosions.push(...(collision.explosionEvents ?? []));
    if ((collision.damageEvents?.length ?? 0) > 0) { this.triggerShake("hit"); this.sound.play("hit"); }
    if (this.damageNumbersEnabled) for (const event of collision.damageEvents ?? []) this.damageNumbers.push({ x: event.x + (Math.random() - 0.5) * 8, y: event.y - 15, amount: event.amount, age: 0, life: 0.65 });
    const bossDefeated = this.boss && collision.destroyedEnemies.has(this.boss);
    this.enemies = this.enemies.filter((current) => !collision.destroyedEnemies.has(current) && (current.boss || current.y < this.bounds.height + 80));
    this.projectiles = this.projectiles.filter((projectile) => !collision.removedProjectiles.has(projectile) && !projectile.isOffscreen(this.bounds.width, this.bounds.height));
    let playerDied = false;
    if (collision.playerDamage > 0) { const canTakeDamage = this.player.invulnerabilityTimer <= 0; if (canTakeDamage) { this.triggerShake("damage"); this.sound.play("playerHit"); } playerDied = this.player.damage(collision.playerDamage); }
    // Apply projectile/weapon enemy removals before ending the run. Contact
    // collisions intentionally leave the enemy on screen.
    if (playerDied) { this.endGame(); return; }
    this.updateDamageNumbers(dt);
    this.updateExplosions(dt);
    this.stars.forEach((star) => { star.y += star.speed * dt; if (star.y > this.bounds.height) star.y = -4; });
    if (bossDefeated || (this.levelConfig && !this.levelConfig.boss && this.score >= this.levelConfig.targetScore)) { this.endGame({ victory: true }); return; }
    this.ui.updateHud({ hp: this.player.hp, maxHp: this.player.stats.maxHp, score: this.score, elapsed: this.elapsed, level: this.levelConfig?.number ?? null, goal: this.levelConfig?.targetScore ?? null, boss: Boolean(this.bossSpawned && this.boss) });
    this.ui.updateSkills(this.skillSystem.getState());
  }

  endGame({ victory = false } = {}) { this.state = "gameover"; this.stopLoop(); this.ui.showGameOver({ score: this.score, elapsed: this.elapsed, victory, level: this.levelNumber, mode: this.mode }); }

  render() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.bounds.height);
    gradient.addColorStop(0, LEVEL_CONFIG.background.top); gradient.addColorStop(1, LEVEL_CONFIG.background.bottom);
    this.ctx.fillStyle = gradient; this.ctx.fillRect(0, 0, this.bounds.width, this.bounds.height);
    this.ctx.save();
    if (this.shakeTime > 0) {
      const intensity = this.shakeStrength * Math.min(1, this.shakeTime / Math.max(0.001, this.shakeDuration));
      this.ctx.translate((Math.random() - 0.5) * intensity * 2, (Math.random() - 0.5) * intensity * 2);
    }
    this.drawGrid();
    for (const star of this.stars) { this.ctx.globalAlpha = star.alpha; this.ctx.fillStyle = "#bceeff"; this.ctx.fillRect(star.x, star.y, star.size, star.size); }
    this.ctx.globalAlpha = 1;
    for (const projectile of this.projectiles) projectile.draw(this.ctx);
    for (const laser of this.lasers) this.drawSonicLaser(laser);
    for (const enemy of this.enemies) enemy.draw(this.ctx);
    this.wingman?.draw(this.ctx);
    for (const decoy of this.decoys) this.player.draw(this.ctx, { x: decoy.x, y: decoy.y, alpha: 0.45, damageMultiplier: decoy.damageMultiplier });
    this.player?.draw(this.ctx);
    this.drawExplosions();
    this.drawDamageNumbers();
    if (this.ionSaw.active) this.drawIonSaw();
    if (this.freezeTimer > 0) { this.ctx.save(); this.ctx.fillStyle = "rgba(150,230,255,.045)"; this.ctx.fillRect(0, 0, this.bounds.width, this.bounds.height); this.ctx.restore(); }
    this.ctx.restore();
  }

  drawIonSaw() {
    this.ctx.save();
    for (const side of [-1, 1]) {
      this.ctx.translate(this.player.x + side * 34, this.player.y);
      this.ctx.rotate(this.elapsed * 14 * side);
      this.ctx.shadowBlur = 20; this.ctx.shadowColor = "#b6f7ff"; this.ctx.strokeStyle = "#b6f7ff"; this.ctx.lineWidth = 4;
      this.ctx.beginPath(); this.ctx.moveTo(-4, -23); this.ctx.lineTo(6, 0); this.ctx.lineTo(-4, 23); this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawSonicLaser(laser) {
    const visualRatio = Math.max(0, Math.min(1, laser.visualLife / SONIC_WAVE_CONFIG.beamVisualLife));
    const ageRatio = Math.max(0, Math.min(1, laser.age / SONIC_WAVE_CONFIG.beamFlashDuration));
    const fade = Math.pow(visualRatio, 0.72);
    const flash = 1 - ageRatio;
    const pulse = 1 + Math.sin(this.elapsed * 26 + laser.y * 0.03) * 0.035;
    const y = laser.y;
    const outerWidth = SONIC_WAVE_CONFIG.beamGlowThickness * pulse + flash * 8;
    const beamWidth = laser.thickness * pulse + flash * 2;

    this.ctx.save();
    this.ctx.globalCompositeOperation = "lighter";
    this.ctx.lineCap = "butt";

    // Broad purple atmosphere around the beam.
    this.ctx.globalAlpha = fade * (0.16 + flash * 0.2);
    this.ctx.shadowBlur = 30 + flash * 18;
    this.ctx.shadowColor = "#b83dff";
    this.ctx.strokeStyle = "#a72dff";
    this.ctx.lineWidth = outerWidth;
    this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.bounds.width, y); this.ctx.stroke();

    // A vertical gradient makes the edge glow fade into the dark background.
    const gradient = this.ctx.createLinearGradient(0, y - beamWidth * 1.8, 0, y + beamWidth * 1.8);
    gradient.addColorStop(0, "rgba(151, 43, 255, 0)");
    gradient.addColorStop(0.28, `rgba(206, 78, 255, ${0.58 * fade})`);
    gradient.addColorStop(0.5, `rgba(255, 122, 255, ${0.98 * fade})`);
    gradient.addColorStop(0.72, `rgba(206, 78, 255, ${0.58 * fade})`);
    gradient.addColorStop(1, "rgba(151, 43, 255, 0)");
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 20 + flash * 14;
    this.ctx.shadowColor = "#ed75ff";
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = beamWidth * 2.2;
    this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.bounds.width, y); this.ctx.stroke();

    // Bright white-pink core. The newest beam gets a brief high-energy flash.
    this.ctx.globalAlpha = fade * (0.86 + flash * 0.14);
    this.ctx.shadowBlur = 9 + flash * 12;
    this.ctx.shadowColor = "#fff5ff";
    this.ctx.strokeStyle = "#fff4ff";
    this.ctx.lineWidth = SONIC_WAVE_CONFIG.beamCoreThickness + flash * 1.2;
    this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.bounds.width, y); this.ctx.stroke();

    // A tiny moving sheen keeps the beam alive without changing its hitbox.
    this.ctx.globalAlpha = fade * (0.22 + flash * 0.24);
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([18, 54]);
    this.ctx.lineDashOffset = -(this.elapsed * 260 + laser.y);
    this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.bounds.width, y); this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();
  }

  drawDamageNumbers() {
    if (!this.damageNumbersEnabled) return;
    this.ctx.save(); this.ctx.font = "800 21px system-ui, sans-serif"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle"; this.ctx.shadowBlur = 13; this.ctx.shadowColor = "#8ff5ff"; this.ctx.lineWidth = 2;
    for (const number of this.damageNumbers) { this.ctx.globalAlpha = Math.max(0, 1 - number.age / number.life); this.ctx.fillStyle = "#e9feff"; this.ctx.strokeStyle = "rgba(15, 52, 75, .78)"; this.ctx.strokeText(`${Math.round(number.amount)}`, number.x, number.y); this.ctx.fillText(`${Math.round(number.amount)}`, number.x, number.y); }
    this.ctx.restore();
  }

  drawExplosions() {
    for (const explosion of this.explosions) {
      const progress = 1 - explosion.life / explosion.maxLife;
      const fade = Math.max(0, 1 - progress);
      const radius = explosion.radius * (0.28 + progress * 0.72);
      this.ctx.save();
      this.ctx.translate(explosion.x, explosion.y);
      this.ctx.globalCompositeOperation = "lighter";
      if (explosion.kind === "psionic") {
        this.drawPsionicExplosion(radius, fade, progress);
        this.ctx.restore();
        continue;
      }
      if (explosion.kind !== "nestMissile") {
        this.drawGenericExplosion(radius, fade, explosion.color ?? "#8ff5ff");
        this.ctx.restore();
        continue;
      }

      // Nest missiles keep the black/red impact signature.
      this.ctx.globalAlpha = fade * 0.18;
      this.ctx.fillStyle = "#ff173f";
      this.ctx.shadowBlur = 28; this.ctx.shadowColor = "#ff173f";
      this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.globalAlpha = fade * 0.92;
      this.ctx.strokeStyle = "#ff294d"; this.ctx.lineWidth = 3; this.ctx.shadowBlur = 18;
      this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.globalAlpha = fade * 0.7;
      this.ctx.strokeStyle = "#ff9baa"; this.ctx.lineWidth = 1.5;
      this.ctx.beginPath(); this.ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.globalAlpha = fade * 0.86;
      this.ctx.strokeStyle = "#ef294d"; this.ctx.lineWidth = 2;
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4 + this.elapsed * 2.5;
        const inner = radius * 0.72; const outer = radius * (1.08 + (index % 2) * 0.12);
        this.ctx.beginPath(); this.ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner); this.ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); this.ctx.stroke();
      }
      this.ctx.globalAlpha = fade * 0.95; this.ctx.fillStyle = "#080a12"; this.ctx.shadowBlur = 8; this.ctx.shadowColor = "#ff173f";
      this.ctx.beginPath(); this.ctx.arc(0, 0, Math.max(4, radius * 0.22), 0, Math.PI * 2); this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawPsionicExplosion(radius, fade, progress) {
    this.ctx.globalAlpha = fade * 0.2;
    this.ctx.fillStyle = "#39f0b0";
    this.ctx.shadowBlur = 30; this.ctx.shadowColor = "#39f0b0";
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.globalAlpha = fade * 0.9;
    this.ctx.strokeStyle = "#72f1c0"; this.ctx.lineWidth = 3; this.ctx.shadowBlur = 18;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.stroke();
    this.ctx.globalAlpha = fade * 0.8;
    this.ctx.strokeStyle = "#d9fff3"; this.ctx.lineWidth = 1.5;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2); this.ctx.stroke();
    this.ctx.globalAlpha = fade * 0.88;
    this.ctx.strokeStyle = "#72f1c0"; this.ctx.lineWidth = 2;
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3 + this.elapsed * 3.2;
      const inner = radius * 0.5; const outer = radius * (1.08 + (index % 2) * 0.16);
      this.ctx.beginPath(); this.ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner); this.ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); this.ctx.stroke();
    }
    this.ctx.globalAlpha = fade;
    this.ctx.fillStyle = "#f4fffc"; this.ctx.shadowBlur = 12; this.ctx.shadowColor = "#72f1c0";
    this.ctx.beginPath(); this.ctx.arc(0, 0, Math.max(3, radius * (0.18 + progress * 0.08)), 0, Math.PI * 2); this.ctx.fill();
  }

  drawGenericExplosion(radius, fade, color) {
    this.ctx.globalAlpha = fade * 0.16;
    this.ctx.fillStyle = color; this.ctx.shadowBlur = 26; this.ctx.shadowColor = color;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.globalAlpha = fade * 0.85;
    this.ctx.strokeStyle = color; this.ctx.lineWidth = 2.5; this.ctx.shadowBlur = 16;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.stroke();
    this.ctx.globalAlpha = fade * 0.9;
    this.ctx.fillStyle = "#ffffff"; this.ctx.shadowBlur = 8;
    this.ctx.beginPath(); this.ctx.arc(0, 0, Math.max(3, radius * 0.2), 0, Math.PI * 2); this.ctx.fill();
  }

  drawGrid() {
    this.ctx.save(); this.ctx.globalAlpha = 0.12; this.ctx.strokeStyle = "#4ec8e9"; this.ctx.lineWidth = 1;
    for (let y = 40; y < this.bounds.height; y += 52) { this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.bounds.width, y); this.ctx.stroke(); }
    for (let x = 24; x < this.bounds.width; x += 48) { this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.bounds.height); this.ctx.stroke(); }
    this.ctx.restore();
  }
}
