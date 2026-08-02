import { GAME_CONFIG, IMPACT_CONFIG, PLAYER_BASE_STATS, SONIC_WAVE_CONFIG } from "../config/game-config.js";
import { LEVEL_CONFIG, getLevelConfig } from "../config/level-config.js";
import { createBossDefinition, getEnemyById } from "../config/enemy-config.js";
import { getEnvironmentPool } from "../config/environment-config.js";
import { ModuleSystem } from "../systems/ModuleSystem.js";
import { getPlayerAttackSpeed, WeaponSystem } from "../systems/WeaponSystem.js";
import { SkillSystem } from "../systems/SkillSystem.js";
import { EnemySpawner } from "../systems/EnemySpawner.js";
import { CollisionSystem } from "../systems/CollisionSystem.js";
import { SoundSystem } from "../systems/SoundSystem.js";
import { Player } from "../entities/Player.js";
import { Wingman } from "../entities/Wingman.js";
import { Decoy } from "../entities/Decoy.js";
import { Enemy } from "../entities/Enemy.js";
import { Projectile } from "../entities/Projectile.js";
import { getDodgeDifficulty } from "../config/dodge-config.js";

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
    this.polarityWindow = 0;
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
    this.ui.bind({ onStart: (spec) => this.start(spec), onMenu: () => this.toMenu(), onPause: () => this.pause(), onResume: () => this.resume(), onSkill: (index) => this.activateSkill(index), onDamageNumbersChanged: (enabled) => { this.damageNumbersEnabled = enabled; if (!enabled) this.damageNumbers = []; }, onVibrationChanged: (enabled) => { this.vibrationEnabled = enabled; }, onSoundChanged: (enabled) => this.sound.setEnabled(enabled), onNextLevel: () => this.start({ ...this.ui.getSelectedIds(), mode: "levels", level: Math.min(50, this.levelNumber + 1) }), onLevelSelect: () => this.toLevelSelect(), onModeSelect: () => this.toModeSelect(), onTutorialBattleExit: () => this.exitTutorialBattle(), onEnvironmentPause: () => this.pauseForEnvironment(), onEnvironmentResume: () => this.resumeFromEnvironment() });
    this.input.setSkillHandler((index) => this.activateSkill(index));
    this.render();
  }

  start(spec) {
    this.stopLoop();
    this.sound.unlock();
    this.sound.startMusic();
    const loadout = this.moduleSystem.install(spec);
    const stats = this.moduleSystem.calculateStats(PLAYER_BASE_STATS, loadout);
    this.player = new Player({ x: this.bounds.width / 2, y: this.bounds.height - 92, stats, loadout });
    this.mode = spec?.mode ?? "endless";
    this.dodgeDifficulty = this.mode === "dodge" ? getDodgeDifficulty(spec?.dodgeDifficulty) : null;
    this.skillSystem = new SkillSystem(this.mode === "dodge" ? [] : loadout);
    this.tutorialMode = Boolean(spec?.tutorial || this.mode === "tutorial");
    this.tutorialHasMoved = false;
    this.tutorialHasUsedSkill = false;
    this.tutorialScoreGoal = this.tutorialMode ? 800 : 0;
    this.levelNumber = Number(spec?.level ?? 1);
    this.levelConfig = this.mode === "levels" ? getLevelConfig(this.levelNumber) : null;
    const spawnerConfig = this.levelConfig
      ? { fixed: true, spawnInterval: this.levelConfig.spawnInterval, minimumSpawnInterval: this.levelConfig.minimumSpawnInterval, speedMultiplier: this.levelConfig.speedMultiplier, hpMultiplier: this.levelConfig.hpMultiplier }
      : { ...LEVEL_CONFIG.difficulty, hpMultiplierStep: LEVEL_CONFIG.difficulty.hpMultiplierStep ?? 0.06 };
    this.spawner = this.mode === "dodge" ? null : new EnemySpawner({ width: this.bounds.width, config: spawnerConfig, pool: this.levelConfig?.enemyPool });
    this.enemies = [];
    this.projectiles = [];
    this.explosions = [];
    this.lasers = [];
    this.decoys = [];
    this.wingman = this.mode === "dodge" ? null : (loadout.modules.some(({ module }) => module?.id === "special-wingman") ? new Wingman(this.player) : null);
    this.freezeTimer = 0;
    this.polarityWindow = 0;
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
    this.environment = null;
    this.dodgePatternTimer = this.mode === "dodge" ? 0.7 : Infinity;
    this.dodgePatternIndex = 0;
    this.dodgeBulletsDodged = 0;
    this.countdownRemaining = 3;
    this.environmentTimer = this.levelConfig?.environment?.firstDelay ?? Infinity;
    this.environmentPool = this.levelConfig?.environmentPool ?? [];
    this.state = "countdown";
    this.ui.showPlaying({ hp: this.player.hp, maxHp: this.player.stats.maxHp, score: 0, elapsed: 0, attackSpeed: getPlayerAttackSpeed(this.player), skills: this.skillSystem.getState(), level: this.levelConfig?.number ?? null, goal: this.levelConfig?.targetScore ?? null, boss: false, tutorial: this.tutorialMode, modeLabel: this.tutorialMode ? "教程 / 800分" : this.dodgeDifficulty ? `躲避 · ${this.dodgeDifficulty.name}` : null });
    this.ui.updateCountdown(this.countdownRemaining);
    this.lastFrame = performance.now();
    this.animationFrame = requestAnimationFrame((time) => this.frame(time));
  }

  stopLoop() { if (this.animationFrame) cancelAnimationFrame(this.animationFrame); this.animationFrame = null; }

  toMenu() { this.stopLoop(); this.state = "menu"; this.ui.showMenu(); this.render(); }
  toLevelSelect() { this.stopLoop(); this.state = "menu"; this.ui.showLevelSelect(); this.render(); }
  toModeSelect() { this.stopLoop(); this.state = "menu"; this.ui.showModeSelect(); this.render(); }
  exitTutorialBattle() { if (!this.tutorialMode) return; if (!this.tutorialHasMoved) { this.ui.showTutorialBattleHint("请先用 WASD / 方向键，或手指拖动飞机移动一次。", false); return; } if (!this.tutorialHasUsedSkill) { this.ui.showTutorialBattleHint("请点击左下角的主动技能按钮，或按数字键释放一次技能。", false); return; } if (this.score < this.tutorialScoreGoal) { this.ui.showTutorialBattleHint(`继续消灭敌机，达到 ${this.tutorialScoreGoal} 分后自动进入下一步（当前 ${Math.floor(this.score)} 分）。`, false); return; } this.stopLoop(); this.state = "menu"; this.ui.completeTutorialAction(1); this.ui.showTutorial(2, false); this.render(); }
  pause() { if (this.state !== "playing") return false; this.state = "paused"; this.stopLoop(); this.ui.showPause(); return true; }
  resume() { if (this.state !== "paused") return false; this.state = "playing"; this.ui.hidePause(); this.lastFrame = performance.now(); this.animationFrame = requestAnimationFrame((time) => this.frame(time)); return true; }
  pauseForEnvironment() { if (this.state !== "playing") return false; this.state = "paused"; this.stopLoop(); return true; }
  resumeFromEnvironment() { if (this.state !== "paused") return false; this.state = "playing"; this.lastFrame = performance.now(); this.animationFrame = requestAnimationFrame((time) => this.frame(time)); return true; }
  triggerShake(kind = "hit") {
    const impact = IMPACT_CONFIG[kind] ?? IMPACT_CONFIG.hit;
    this.shakeTime = Math.max(this.shakeTime, impact.duration);
    this.shakeDuration = Math.max(this.shakeDuration, impact.duration);
    this.shakeStrength = Math.max(this.shakeStrength, impact.strength);
    if (this.vibrationEnabled && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(impact.vibration);
  }

  activateSkill(index) { const activated = this.skillSystem?.activate(index, this); if (activated) { this.sound.play("skill"); if (this.tutorialMode) { this.tutorialHasUsedSkill = true; this.exitTutorialBattle(); } } return activated; }
  startOverclock(duration) { this.player.overclockTimer = duration; }
  markPolarityProjectile(projectile) { if (!projectile || projectile.team !== "enemy" || projectile.polarityDelay > 0 || projectile.kind === "blackHole") return; projectile.polarityDelay = 0.25; projectile.vx = 0; projectile.vy = 0; projectile.polarityColor = "#9d7bff"; }
  convertPolarityProjectile(projectile) { if (!projectile || projectile.polarityDelay > 0) return; projectile.team = "player"; projectile.kind = "polarityBolt"; projectile.color = projectile.polarityColor ?? "#9d7bff"; projectile.vx = 0; projectile.vy = -Math.max(220, GAME_CONFIG.projectile.enemySpeed * 1.15); projectile.pierce = false; projectile.life = Math.max(3, projectile.life); }
  startPolarityReverse(duration) { this.polarityWindow = Math.max(this.polarityWindow, duration); for (const projectile of this.projectiles) this.markPolarityProjectile(projectile); }
  applyBlackHolePull(dt) {
    const holes = this.projectiles.filter((projectile) => projectile.kind === "blackHole" && projectile.life > 0);
    for (const hole of holes) {
      const field = hole.blackHole ?? {}; const radius = field.pullRadius ?? 66; const strength = field.pullStrength ?? 105;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        const dx = hole.x - enemy.x; const dy = hole.y - enemy.y; const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < radius) {
          field.slowed = true;
          if (!field.enemyCaptured) {
            field.enemyCaptured = true;
            field.detonationTimer = field.detonationDelay ?? 1;
          }
          const force = strength * (1 - distance / radius); enemy.x += dx / distance * force * dt; enemy.y += dy / distance * force * dt;
        }
      }
      if (field.enemyCaptured && !field.exploded) {
        field.detonationTimer = Math.max(0, (field.detonationTimer ?? 1) - dt);
        if (field.detonationTimer <= 0) hole.life = 0;
      }
      for (const projectile of this.projectiles) {
        if (projectile === hole || projectile.team !== "enemy" || projectile.polarityDelay > 0 || (projectile.blackHoleCapturedBy && projectile.blackHoleCapturedBy !== hole)) continue;
        const dx = hole.x - projectile.x; const dy = hole.y - projectile.y; const distance = Math.hypot(dx, dy);
        if (projectile.blackHoleCapturedBy === hole) continue;
        if (distance > 0 && distance < radius) {
          projectile.blackHoleCapturedBy = hole;
          projectile.blackHoleOrbit = { radius: Math.max(8, radius * (0.22 + Math.random() * 0.58)), angle: Math.random() * Math.PI * 2, speed: (1.8 + Math.random() * 2.4) * (Math.random() < 0.5 ? -1 : 1) };
          field.capturedProjectiles ??= new Set(); field.capturedProjectiles.add(projectile);
          projectile.vx = 0; projectile.vy = 0;
        }
      }
    }
  }
  createDecoy(duration) { this.decoys.push(new Decoy(this.player, duration)); }
  startIonSaw(duration) { this.ionSaw.active = true; this.ionSaw.duration = Math.max(this.ionSaw.duration ?? 0, duration); this.ionSaw.damageTimer = 0; }
  startSonicWave(duration) { this.sonicWaves.push({ duration, spawnTimer: 0, nextY: this.player.y, step: SONIC_WAVE_CONFIG.spawnStep }); }

  createDodgeBullet({ x, y, vx = 0, vy = 120, radius = 7, kind = "dodgeOrb", color = "#ff7fd1", damage = this.dodgeDifficulty.damage, life = 8, dodgeMotion = null }) {
    const projectile = new Projectile({ x, y, vx, vy, damage, radius, color, life, team: "enemy", kind, dodgeMotion });
    projectile.dodgeBullet = true;
    return projectile;
  }

  spawnDodgePattern() {
    const difficulty = this.dodgeDifficulty;
    if (!difficulty) return;
    const count = difficulty.bulletCount;
    const speed = difficulty.speed * (1 + Math.min(0.55, this.elapsed / 150));
    const pattern = this.dodgePatternIndex % 5;
    this.dodgePatternIndex += 1;
    if (pattern === 0) {
      for (let index = 0; index < count; index += 1) {
        this.projectiles.push(this.createDodgeBullet({ x: 28 + Math.random() * (this.bounds.width - 56), y: -18 - index * 20, vy: speed, radius: 7, kind: "dodgeOrb", color: "#ff80d8" }));
      }
    } else if (pattern === 1) {
      const amount = 5 + count;
      for (let index = 0; index < amount; index += 1) {
        const angle = ((index / (amount - 1)) - 0.5) * 1.25;
        this.projectiles.push(this.createDodgeBullet({ x: this.bounds.width / 2, y: -18, vx: Math.sin(angle) * speed, vy: Math.cos(angle) * speed, radius: 6, kind: "dodgeShard", color: "#a78bff" }));
      }
    } else if (pattern === 2) {
      const fromLeft = this.dodgePatternIndex % 2 === 0;
      const amount = 2 + count;
      for (let index = 0; index < amount; index += 1) {
        this.projectiles.push(this.createDodgeBullet({ x: fromLeft ? -18 : this.bounds.width + 18, y: 100 + Math.random() * 390, vx: (fromLeft ? 1 : -1) * speed, vy: (Math.random() - 0.5) * 35, radius: 8, kind: "dodgeLine", color: "#65e7ff", life: 7 }));
      }
    } else if (pattern === 3) {
      const amount = 7 + count * 2;
      for (let index = 0; index < amount; index += 1) {
        const angle = (index / amount) * Math.PI * 2 + this.elapsed * 0.55;
        this.projectiles.push(this.createDodgeBullet({ x: this.bounds.width / 2, y: 235, vx: Math.cos(angle) * speed * 0.74, vy: Math.sin(angle) * speed * 0.74, radius: 6, kind: "dodgeRing", color: "#ffd36e", life: 7 }));
      }
    } else {
      const amount = 4 + count;
      for (let index = 0; index < amount; index += 1) {
        const x = 30 + (index / Math.max(1, amount - 1)) * (this.bounds.width - 60);
        this.projectiles.push(this.createDodgeBullet({ x, y: -20 - index * 28, vy: speed * 0.86, radius: 6, kind: "dodgeWave", color: "#ff9b68", dodgeMotion: { type: "sine", amplitude: 34 + count * 5, frequency: 1.4 + index * 0.07, phase: index * 0.8 } }));
      }
    }
  }

  updateDodgeMode(dt) {
    const difficulty = this.dodgeDifficulty;
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.player.update(dt, this.input, this.bounds);
    this.dodgePatternTimer -= dt;
    if (this.dodgePatternTimer <= 0) {
      this.spawnDodgePattern();
      this.dodgePatternTimer = Math.max(0.28, difficulty.spawnInterval * (1 - Math.min(0.3, this.elapsed / 180)));
    }
    for (const projectile of this.projectiles) projectile.update(dt, [], this.bounds);
    const collision = this.collisionSystem.resolve({ player: this.player, enemies: [], projectiles: this.projectiles });
    let dodged = 0;
    this.projectiles = this.projectiles.filter((projectile) => {
      if (collision.removedProjectiles.has(projectile)) return false;
      if (projectile.isOffscreen(this.bounds.width, this.bounds.height)) { if (projectile.dodgeBullet) dodged += 1; return false; }
      return true;
    });
    this.dodgeBulletsDodged += dodged;
    this.score += difficulty.scorePerSecond * dt + dodged * difficulty.scorePerBullet;
    if (collision.playerDamage > 0) { const canTakeDamage = this.player.invulnerabilityTimer <= 0; if (canTakeDamage) { this.triggerShake("damage"); this.sound.play("playerHit"); } if (this.player.damage(collision.playerDamage)) { this.endGame(); return; } }
    this.updateDamageNumbers(dt);
    this.stars.forEach((star) => { star.y += star.speed * dt; if (star.y > this.bounds.height) star.y = -4; });
    this.ui.updateHud({ hp: this.player.hp, maxHp: this.player.stats.maxHp, score: this.score, elapsed: this.elapsed, attackSpeed: getPlayerAttackSpeed(this.player), modeLabel: `躲避 · ${difficulty.name}` });
  }

  updateEnvironment(dt) {
    if (!this.levelConfig?.environment) return;
    if (this.environment) {
      this.environment.remaining -= dt;
      if (this.environment.remaining <= 0) {
        this.environment = null;
        this.environmentTimer = this.levelConfig.environment.interval;
      }
      return;
    }
    this.environmentTimer -= dt;
    if (this.environmentTimer > 0) return;
    const pool = this.environmentPool.length ? this.environmentPool : getEnvironmentPool(this.levelNumber);
    const definition = pool[Math.floor(Math.random() * pool.length)];
    if (!definition) return;
    this.environment = { definition, remaining: definition.duration };
  }

  environmentEffects() {
    const active = this.environment?.definition;
    return { player: active?.player ?? {}, enemy: active?.enemy ?? {} };
  }

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
    if (this.state !== "playing" && this.state !== "countdown") return;
    const dt = Math.min(0.034, Math.max(0.001, (time - this.lastFrame) / 1000));
    this.lastFrame = time;
    if (this.state === "countdown") {
      this.countdownRemaining = Math.max(0, this.countdownRemaining - dt);
      this.ui.updateCountdown(this.countdownRemaining);
      this.render();
      if (this.countdownRemaining <= 0) {
        this.state = "playing";
        this.lastFrame = time;
        this.ui.updateCountdown(0);
      }
      this.animationFrame = requestAnimationFrame((next) => this.frame(next));
      return;
    }
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
    if (this.mode === "dodge") { this.updateDodgeMode(dt); return; }
    this.updateEnvironment(dt);
    const environmentEffects = this.environmentEffects();
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.skillSystem.update(dt);
    this.polarityWindow = Math.max(0, this.polarityWindow - dt);
    this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    this.ionSaw.duration = Math.max(0, (this.ionSaw.duration ?? 0) - dt);
    this.ionSaw.active = this.ionSaw.duration > 0;
    this.ionSaw.damageTimer -= dt;
    this.updateSonicWave(dt);
    this.player.environmentAttackSpeedMultiplier = environmentEffects.player.attackSpeed ?? 1;
    const wasOverclocked = this.player.overclockTimer > 0;
    const previousPlayerPosition = { x: this.player.x, y: this.player.y };
    this.player.update(dt, this.input, this.bounds, environmentEffects.player.moveSpeed ?? 1);
    if (this.tutorialMode && !this.tutorialHasMoved && Math.hypot(this.player.x - previousPlayerPosition.x, this.player.y - previousPlayerPosition.y) > 2) {
      this.tutorialHasMoved = true;
      this.exitTutorialBattle();
    }
    if (wasOverclocked && this.player.overclockTimer <= 0) this.player.weaponSilenceTimer = Math.max(this.player.weaponSilenceTimer, 1);
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
      current.environmentSpeedMultiplier = environmentEffects.enemy.speed ?? 1;
      current.environmentShootIntervalMultiplier = environmentEffects.enemy.shootInterval ?? 1;
      current.environmentProjectileSpeedMultiplier = environmentEffects.enemy.projectileSpeed ?? 1;
      current.update(dt, this.bounds);
      if (current.canShoot()) {
        const shots = this.weaponSystem.fireEnemy(current, this.player);
        this.projectiles.push(...(Array.isArray(shots) ? shots : [shots]));
      }
    }
    if (this.polarityWindow > 0) for (const projectile of this.projectiles) this.markPolarityProjectile(projectile);
    this.applyBlackHolePull(dt);
    for (const projectile of this.projectiles) {
      if (projectile.polarityDelay > 0) { projectile.polarityDelay = Math.max(0, projectile.polarityDelay - dt); if (projectile.polarityDelay > 0) continue; this.convertPolarityProjectile(projectile); }
      if (this.freezeTimer > 0 && projectile.team === "enemy") continue;
      projectile.update(dt, this.enemies, this.bounds);
    }

    const collision = this.collisionSystem.resolve({ player: this.player, enemies: this.enemies, projectiles: this.projectiles, wingman: this.wingman, lasers: this.lasers, freezeActive: this.freezeTimer > 0, ionSaw: this.ionSaw });
    if (collision.sawTriggered) this.ionSaw.damageTimer = 1 / 6;
    this.score += collision.score;
    if (this.tutorialMode && this.tutorialHasMoved && this.tutorialHasUsedSkill && this.score >= this.tutorialScoreGoal) { this.exitTutorialBattle(); return; }
    this.explosions.push(...(collision.explosionEvents ?? []));
    if ((collision.damageEvents?.length ?? 0) > 0) { this.triggerShake("hit"); this.sound.play("playerImpact"); }
    if ((collision.explosionEvents ?? []).some((explosion) => explosion.kind === "blackHole")) { this.triggerShake("hit"); this.sound.play("blackHoleExplosion"); }
    if (this.damageNumbersEnabled) for (const event of collision.damageEvents ?? []) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 10;
      this.damageNumbers.push({ x: event.x + Math.cos(angle) * radius, y: event.y + Math.sin(angle) * radius, amount: event.amount, age: 0, life: 0.65 });
    }
    const bossDefeated = this.boss && collision.destroyedEnemies.has(this.boss);
    this.enemies = this.enemies.filter((current) => !collision.destroyedEnemies.has(current) && (current.boss || current.y < this.bounds.height + 80));
    this.projectiles = this.projectiles.filter((projectile) => !collision.removedProjectiles.has(projectile) && !projectile.isOffscreen(this.bounds.width, this.bounds.height));
    let playerDied = false;
    if (collision.playerDamage > 0) { const canTakeDamage = this.player.invulnerabilityTimer <= 0; if (canTakeDamage) { this.triggerShake("damage"); this.sound.play("playerHit"); } playerDied = this.player.damage(collision.playerDamage); }
    // Apply projectile/weapon enemy removals before ending the run. Contact
    // collisions intentionally leave the enemy on screen.
    if (playerDied) { if (this.tutorialMode) this.exitTutorialBattle(); else this.endGame(); return; }
    this.updateDamageNumbers(dt);
    this.updateExplosions(dt);
    this.stars.forEach((star) => { star.y += star.speed * dt; if (star.y > this.bounds.height) star.y = -4; });
    if (bossDefeated || (this.levelConfig && !this.levelConfig.boss && this.score >= this.levelConfig.targetScore)) { this.endGame({ victory: true }); return; }
    this.ui.updateHud({ hp: this.player.hp, maxHp: this.player.stats.maxHp, score: this.score, elapsed: this.elapsed, attackSpeed: getPlayerAttackSpeed(this.player), level: this.levelConfig?.number ?? null, goal: this.levelConfig?.targetScore ?? null, boss: Boolean(this.bossSpawned && this.boss), environment: this.environment, modeLabel: this.tutorialMode ? "教程 / 800分" : null });
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
    this.drawEnvironment();
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

  drawEnvironment() {
    if (!this.environment) return;
    const { definition, remaining } = this.environment;
    this.ctx.save();
    this.ctx.globalCompositeOperation = "screen";
    this.ctx.globalAlpha = 0.11 + Math.sin(this.elapsed * 4) * 0.025;
    this.ctx.fillStyle = definition.color;
    this.ctx.fillRect(0, 0, this.bounds.width, this.bounds.height);
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
      if (explosion.kind === "blackHole") {
        this.drawBlackHoleExplosion(radius, fade, progress);
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

  drawBlackHoleExplosion(radius, fade, progress) {
    this.ctx.globalAlpha = fade * 0.3;
    this.ctx.fillStyle = "#7b3dce"; this.ctx.shadowBlur = 34; this.ctx.shadowColor = "#b57bff";
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.globalAlpha = fade * 0.95;
    this.ctx.strokeStyle = "#d8baff"; this.ctx.lineWidth = 3.5; this.ctx.shadowBlur = 24;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius * (0.48 + progress * 0.52), 0, Math.PI * 2); this.ctx.stroke();
    this.ctx.globalAlpha = fade * 0.8;
    this.ctx.strokeStyle = "#8b4ee4"; this.ctx.lineWidth = 2; this.ctx.shadowBlur = 12;
    for (let index = 0; index < 10; index += 1) {
      const angle = index * Math.PI / 5 + this.elapsed * 3.5;
      const inner = radius * 0.45; const outer = radius * (0.95 + (index % 2) * 0.2);
      this.ctx.beginPath(); this.ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner); this.ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); this.ctx.stroke();
    }
    this.ctx.globalAlpha = fade;
    this.ctx.fillStyle = "#ffffff"; this.ctx.shadowBlur = 18; this.ctx.shadowColor = "#f1ddff";
    this.ctx.beginPath(); this.ctx.arc(0, 0, Math.max(3, radius * (0.2 - progress * 0.08)), 0, Math.PI * 2); this.ctx.fill();
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
    const columns = 15;
    const rows = 15;
    const horizontalColor = this.ctx.createLinearGradient(0, 0, 0, this.bounds.height);
    horizontalColor.addColorStop(0, "rgba(65, 204, 255, .44)");
    horizontalColor.addColorStop(.52, "rgba(255, 87, 207, .4)");
    horizontalColor.addColorStop(1, "rgba(148, 111, 255, .42)");
    const verticalColor = this.ctx.createLinearGradient(0, 0, this.bounds.width, 0);
    verticalColor.addColorStop(0, "rgba(65, 204, 255, .38)");
    verticalColor.addColorStop(.52, "rgba(255, 87, 207, .36)");
    verticalColor.addColorStop(1, "rgba(148, 111, 255, .38)");
    this.ctx.save();
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = .9;
    for (let row = 0; row <= rows; row += 1) {
      const y = Math.round(row * this.bounds.height / rows) + .5;
      this.ctx.strokeStyle = horizontalColor;
      this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.bounds.width, y); this.ctx.stroke();
    }
    for (let column = 0; column <= columns; column += 1) {
      const x = Math.round(column * this.bounds.width / columns) + .5;
      this.ctx.strokeStyle = verticalColor;
      this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.bounds.height); this.ctx.stroke();
    }
    this.ctx.globalAlpha = .65;
    this.ctx.strokeStyle = "rgba(100, 231, 255, .52)";
    this.ctx.strokeRect(.5, .5, this.bounds.width - 1, this.bounds.height - 1);
    this.ctx.restore();
  }
}
