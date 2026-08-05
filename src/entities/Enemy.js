export class Enemy {
  constructor(definition, x, difficulty = {}) {
    this.id = `${definition.id}-${Math.random().toString(36).slice(2, 8)}`;
    this.definition = definition;
    this.boss = Boolean(definition.boss);
    this.level = difficulty.level ?? 1;
    this.x = x;
    this.y = this.boss ? 112 : (difficulty.spawnY ?? -definition.radius - 10);
    this.baseX = x;
    this.age = 0;
    this.radius = definition.radius;
    this.hp = Math.ceil(definition.hp * (difficulty.hpMultiplier ?? 1));
    this.maxHp = this.hp;
    this.speed = definition.speed * (difficulty.speedMultiplier ?? 1);
    this.damageMultiplier = difficulty.damageMultiplier ?? 1;
    this.shootTimer = definition.shootInterval * (0.55 + Math.random() * 0.45);
    this.silenceTimer = 0;
    this.frozen = false;
    this.summoned = Boolean(difficulty.summoned);
    this.environmentSpeedMultiplier = 1;
    this.environmentShootIntervalMultiplier = 1;
    this.environmentProjectileSpeedMultiplier = 1;
    this.dashTimer = definition.dashInterval ? definition.dashInterval * (0.55 + Math.random() * 0.3) : 0;
    this.dashTime = 0;
    this.bossChargeTimer = definition.dashInterval ?? 0;
    this.bossChargeTime = 0;
    this.shieldActive = false;
    this.burn = null;
    this.slowTimer = 0;
    this.slowMultiplier = 1;
    this.azureShrinkTimer = 0;
    this.azureShrinkScale = 1;
    this.azureSpeedMultiplier = 1;
    this.azureShootMultiplier = 1;
    this.azureDamageMultiplier = 1;
    this.featherMarkTimer = 0;
    this.featherMarkHits = 0;
    this.featherBurstTimer = 0;
    this.obsidianCuts = [];
    this.darkErosionMarks = 0;
  }

  update(dt, bounds = { width: 480 }) {
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    this.azureShrinkTimer = Math.max(0, this.azureShrinkTimer - dt);
    this.featherMarkTimer = Math.max(0, this.featherMarkTimer - dt);
    this.featherBurstTimer = Math.max(0, this.featherBurstTimer - dt);
    if (this.featherMarkTimer <= 0) this.featherMarkHits = 0;
    if (this.azureShrinkTimer <= 0) { this.azureShrinkScale = 1; this.azureSpeedMultiplier = 1; this.azureShootMultiplier = 1; this.azureDamageMultiplier = 1; }
    if (this.frozen) return;
    const behaviorDt = dt * (this.slowTimer > 0 ? this.slowMultiplier : 1) * this.azureSpeedMultiplier;
    this.age += behaviorDt;
    if (this.boss) {
      this.bossChargeTimer -= behaviorDt;
      if (this.bossChargeTimer <= 0 && this.definition.dashInterval) {
        this.bossChargeTime = this.definition.dashDuration ?? 0.5;
        this.bossChargeTimer = this.definition.dashInterval;
      }
      this.bossChargeTime = Math.max(0, this.bossChargeTime - behaviorDt);
      const movement = this.bossChargeTime > 0 ? 1.85 : 0.9;
      this.x = bounds.width / 2 + Math.sin(this.age * movement) * bounds.width * (this.bossChargeTime > 0 ? 0.43 : 0.32);
      this.y = 118 + Math.sin(this.age * 1.55) * 66;
    } else {
      this.dashTimer -= behaviorDt;
      if (this.definition.movement === "dash" && this.dashTimer <= 0) {
        this.dashTime = this.definition.dashDuration ?? 0.6;
        this.dashTimer = this.definition.dashInterval ?? 3;
      }
      this.dashTime = Math.max(0, this.dashTime - behaviorDt);
      const speed = this.speed * this.environmentSpeedMultiplier * (this.dashTime > 0 ? (this.definition.dashMultiplier ?? 2.6) : 1);
      this.y += speed * behaviorDt;
      if (this.definition.movement === "sine") this.x = this.baseX + Math.sin(this.age * 3.2) * 38;
      if (this.definition.movement === "orbit") this.x = this.baseX + Math.sin(this.age * 2.1) * 70;
      if (this.definition.movement === "zigzag") this.x = this.baseX + Math.sin(this.age * 4.6) * 64;
      this.isPhased = this.definition.ability === "phase" && Math.sin(this.age * 2.5) > 0.45;
      if (this.definition.ability === "shield") {
        const cycle = this.definition.shieldCycle ?? 4;
        this.shieldActive = (this.age % cycle) < (this.definition.shieldDuration ?? 1.4);
      }
    }
    this.shootTimer -= behaviorDt;
    this.silenceTimer = Math.max(0, this.silenceTimer - dt);
  }

  canShoot() {
    if (this.shootTimer > 0 || this.silenceTimer > 0 || this.frozen) return false;
    this.shootTimer = this.definition.shootInterval * this.environmentShootIntervalMultiplier * this.azureShootMultiplier;
    return true;
  }

  takeDamage(amount) {
    this.hp -= this.shieldActive ? amount * 0.35 : amount;
    return this.hp <= 0;
  }

  applySlow({ multiplier = .67, duration = 3 } = {}) {
    this.slowMultiplier = Math.max(0.01, Math.min(1, multiplier));
    this.slowTimer = Math.max(0, duration);
  }

  applyAzureShrink({ duration = 3.2 } = {}) {
    if (this.boss) return false;
    const bossScale = 0.55;
    const lift = 96;
    this.y = Math.max(this.radius + 6, this.y - lift);
    this.azureShrinkTimer = Math.max(this.azureShrinkTimer, duration);
    this.azureShrinkScale = bossScale;
    this.azureSpeedMultiplier = 0.75;
    this.azureShootMultiplier = 1.35;
    this.azureDamageMultiplier = 0.5;
    return true;
  }

  applyFeatherHit({ duration = 3, knockback = 58 } = {}) {
    if (this.featherMarkTimer <= 0) this.featherMarkHits = 0;
    this.featherMarkTimer = duration;
    this.featherMarkHits += 1;
    if (this.featherMarkHits < 2) return false;
    this.featherMarkHits = 0;
    this.featherMarkTimer = 0;
    this.y = Math.max(this.radius + 6, this.y - (this.boss ? knockback * 0.45 : knockback));
    this.featherBurstTimer = 0.34;
    return true;
  }

  applyObsidianCut({ delay = 0.65, damage = 8, element = "dark" } = {}) {
    this.obsidianCuts.push({ remaining: delay, damage, element });
  }

  updateObsidianCuts(dt) {
    if (!this.obsidianCuts.length) return [];
    const events = [];
    this.obsidianCuts = this.obsidianCuts.filter((cut) => {
      cut.remaining -= dt;
      if (cut.remaining > 0) return true;
      events.push({ enemy: this, amount: cut.damage, element: cut.element });
      return false;
    });
    return events;
  }

  applyBurn(effect = {}) {
    this.burn = { duration: effect.duration ?? 3, remaining: effect.duration ?? 3, tickInterval: effect.tickInterval ?? (1 / 3), tickTimer: effect.tickInterval ?? (1 / 3), damage: effect.damage ?? 1, ticksRemaining: effect.ticks ?? 9 };
  }

  updateBurn(dt) {
    if (!this.burn || this.hp <= 0) return [];
    this.burn.remaining -= dt; this.burn.tickTimer -= dt;
    const events = [];
    while (this.burn.tickTimer <= 0 && this.burn.ticksRemaining > 0 && this.hp > 0) {
      events.push({ enemy: this, amount: this.burn.damage, element: "fire" });
      this.burn.ticksRemaining -= 1; this.burn.tickTimer += this.burn.tickInterval;
    }
    if (this.burn.remaining <= 0 || this.burn.ticksRemaining <= 0) this.burn = null;
    return events;
  }

  silence(seconds) { this.silenceTimer = Math.max(this.silenceTimer, seconds); }

  draw(ctx) {
    const { type, color, bossShape } = this.definition;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = this.isPhased ? 0.28 : 1;
    if (this.azureShrinkTimer > 0) ctx.scale(this.azureShrinkScale, this.azureShrinkScale);
    ctx.rotate(type === "swift" ? Math.sin(this.age * 4) * 0.18 : 0);
    if (["comet", "pendulum", "ribbon", "petal"].includes(type)) ctx.rotate(Math.PI);
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (this.boss) {
      if (bossShape === "storm") { ctx.moveTo(0, -50); ctx.lineTo(18, -18); ctx.lineTo(48, -14); ctx.lineTo(27, 6); ctx.lineTo(38, 38); ctx.lineTo(0, 27); ctx.lineTo(-38, 38); ctx.lineTo(-27, 6); ctx.lineTo(-48, -14); ctx.lineTo(-18, -18); }
      else if (bossShape === "nest" || bossShape === "hive") { ctx.moveTo(0, -51); ctx.lineTo(35, -29); ctx.lineTo(48, 4); ctx.lineTo(28, 41); ctx.lineTo(0, 49); ctx.lineTo(-28, 41); ctx.lineTo(-48, 4); ctx.lineTo(-35, -29); }
      else if (bossShape === "prism") { ctx.moveTo(0, -55); ctx.lineTo(48, 0); ctx.lineTo(0, 55); ctx.lineTo(-48, 0); }
      else if (bossShape === "cryo") { for (let i = 0; i < 12; i += 1) { const angle = -Math.PI / 2 + i * Math.PI * 2 / 12; const radius = i % 2 ? 38 : 52; const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }
      else if (bossShape === "lattice") { ctx.moveTo(0, -53); ctx.lineTo(44, -25); ctx.lineTo(44, 25); ctx.lineTo(0, 53); ctx.lineTo(-44, 25); ctx.lineTo(-44, -25); }
      else if (bossShape === "abyss") { ctx.moveTo(0, -52); ctx.quadraticCurveTo(53, -24, 34, 22); ctx.quadraticCurveTo(16, 54, 0, 34); ctx.quadraticCurveTo(-16, 54, -34, 22); ctx.quadraticCurveTo(-53, -24, 0, -52); }
      else if (bossShape === "chorus") { ctx.arc(0, 0, 45, 0, Math.PI * 2); }
      else { ctx.moveTo(0, -48); ctx.lineTo(38, -20); ctx.lineTo(48, 18); ctx.lineTo(20, 42); ctx.lineTo(-20, 42); ctx.lineTo(-48, 18); ctx.lineTo(-38, -20); }
    } else if (type === "guardian") {
      ctx.moveTo(0, -25); ctx.lineTo(21, -8); ctx.lineTo(17, 17); ctx.lineTo(0, 24); ctx.lineTo(-17, 17); ctx.lineTo(-21, -8);
    } else if (type === "swift") {
      ctx.moveTo(0, 19); ctx.lineTo(13, -14); ctx.lineTo(3, -9); ctx.lineTo(0, -22); ctx.lineTo(-3, -9); ctx.lineTo(-13, -14);
    } else if (type === "orbit") {
      ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.strokeStyle = "#b4fff0"; ctx.lineWidth = 3; ctx.stroke(); ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.moveTo(0, -22); ctx.lineTo(0, 22);
    } else if (type === "phantom") {
      ctx.moveTo(0, 21); ctx.lineTo(18, -4); ctx.lineTo(8, -18); ctx.lineTo(0, -10); ctx.lineTo(-8, -18); ctx.lineTo(-18, -4);
    } else if (type === "striker") {
      ctx.moveTo(0, 24); ctx.lineTo(20, -14); ctx.lineTo(7, -10); ctx.lineTo(0, -22); ctx.lineTo(-7, -10); ctx.lineTo(-20, -14);
    } else if (type === "bulwark") {
      ctx.rect(-22, -20, 44, 40);
    } else if (type === "rammer") {
      ctx.moveTo(0, 26); ctx.lineTo(18, -18); ctx.lineTo(0, -12); ctx.lineTo(-18, -18);
    } else if (type === "prism") {
      ctx.moveTo(0, -24); ctx.lineTo(21, 0); ctx.lineTo(0, 24); ctx.lineTo(-21, 0);
    } else if (type === "anchor") {
      ctx.moveTo(-18, -17); ctx.lineTo(18, -17); ctx.lineTo(12, 9); ctx.lineTo(0, 23); ctx.lineTo(-12, 9);
    } else if (type === "echo") {
      ctx.moveTo(0, 22); ctx.lineTo(19, -15); ctx.lineTo(4, -9); ctx.lineTo(0, -23); ctx.lineTo(-4, -9); ctx.lineTo(-19, -15);
    } else if (type === "loom") {
      ctx.moveTo(0, -23); ctx.lineTo(19, -10); ctx.lineTo(19, 12); ctx.lineTo(0, 23); ctx.lineTo(-19, 12); ctx.lineTo(-19, -10);
    } else if (type === "lantern") {
      ctx.rect(-15, -14, 30, 31);
    } else if (type === "comet") {
      ctx.moveTo(0, -25); ctx.lineTo(17, -4); ctx.lineTo(7, 21); ctx.lineTo(0, 13); ctx.lineTo(-7, 21); ctx.lineTo(-17, -4);
    } else if (type === "pendulum") {
      ctx.moveTo(0, -22); ctx.lineTo(15, -5); ctx.lineTo(12, 16); ctx.lineTo(0, 24); ctx.lineTo(-12, 16); ctx.lineTo(-15, -5);
    } else if (type === "ribbon") {
      ctx.moveTo(0, -22); ctx.quadraticCurveTo(28, -10, 19, 6); ctx.quadraticCurveTo(10, 22, 0, 14); ctx.quadraticCurveTo(-10, 22, -19, 6); ctx.quadraticCurveTo(-28, -10, 0, -22);
    } else if (type === "drum") {
      ctx.arc(0, 0, 21, 0, Math.PI * 2);
    } else if (type === "petal") {
      ctx.moveTo(0, -23); ctx.quadraticCurveTo(19, -18, 11, -2); ctx.quadraticCurveTo(24, 7, 7, 11); ctx.quadraticCurveTo(0, 25, -7, 11); ctx.quadraticCurveTo(-24, 7, -11, -2); ctx.quadraticCurveTo(-19, -18, 0, -23);
    } else {
      ctx.moveTo(0, 21); ctx.lineTo(16, -8); ctx.lineTo(6, -5); ctx.lineTo(0, -18); ctx.lineTo(-6, -5); ctx.lineTo(-16, -8);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#241b3a";
    ctx.beginPath(); ctx.arc(0, 0, type === "guardian" ? 7 : 5, 0, Math.PI * 2); ctx.fill();
    if (this.boss) {
      ctx.shadowBlur = 14; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 57 + Math.sin(this.age * 5) * 3, 0, Math.PI * 2); ctx.stroke();
      ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = 1.4; ctx.strokeStyle = "#f4ffff";
      if (bossShape === "storm") { for (const angle of [-.7, .1, .9]) { ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15); ctx.lineTo(Math.cos(angle + .2) * 43, Math.sin(angle + .2) * 43); ctx.stroke(); } }
      else if (bossShape === "nest" || bossShape === "hive") { for (let i = 0; i < 3; i += 1) { const x = (i - 1) * 17; ctx.beginPath(); ctx.arc(x, bossShape === "hive" ? 7 : 0, 7, 0, Math.PI * 2); ctx.stroke(); } }
      else if (bossShape === "prism" || bossShape === "lattice") { ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(0, -34); ctx.lineTo(34, 0); ctx.lineTo(0, 34); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-44, 0); ctx.lineTo(44, 0); ctx.moveTo(0, -44); ctx.lineTo(0, 44); ctx.stroke(); }
      else if (bossShape === "cryo") { for (let i = 0; i < 6; i += 1) { const angle = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * 41, Math.sin(angle) * 41); ctx.stroke(); } }
      else if (bossShape === "abyss") { ctx.strokeStyle = "#e7baff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 18, this.age * 2, this.age * 2 + Math.PI * 1.65); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 32, -this.age * 1.4, -this.age * 1.4 + Math.PI * 1.25); ctx.stroke(); }
      else if (bossShape === "chorus") { for (let y = -18; y <= 18; y += 12) { ctx.beginPath(); ctx.moveTo(-34, y); ctx.quadraticCurveTo(0, y + Math.sin(this.age * 3 + y) * 8, 34, y); ctx.stroke(); } }
    }
    if (type === "prism") { ctx.strokeStyle = "#f0ffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(0, 19); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke(); }
    if (type === "anchor") { ctx.strokeStyle = "#fff0b8"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, 17); ctx.moveTo(-14, 9); ctx.quadraticCurveTo(0, 27, 14, 9); ctx.stroke(); }
    if (type === "echo") { ctx.globalAlpha = .42; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, 18); ctx.lineTo(-25, -10); ctx.moveTo(14, 18); ctx.lineTo(25, -10); ctx.stroke(); ctx.globalAlpha = 1; }
    if (type === "loom") { ctx.strokeStyle = "#fff1fb"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-16, -9); ctx.lineTo(16, 12); ctx.moveTo(16, -9); ctx.lineTo(-16, 12); ctx.stroke(); }
    if (type === "lantern") { ctx.strokeStyle = "#efffd0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -16, 8, Math.PI, 0); ctx.moveTo(-11, 17); ctx.lineTo(11, 17); ctx.stroke(); }
    if (type === "comet") { ctx.globalAlpha = .55; ctx.strokeStyle = "#d9f7ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 19); ctx.lineTo(0, 34); ctx.moveTo(-5, 19); ctx.lineTo(-12, 29); ctx.moveTo(5, 19); ctx.lineTo(12, 29); ctx.stroke(); ctx.globalAlpha = 1; }
    if (type === "pendulum") { ctx.strokeStyle = "#fff2df"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(0, 18); ctx.arc(0, 18, 6, 0, Math.PI * 2); ctx.stroke(); }
    if (type === "ribbon") { ctx.strokeStyle = "#d8fff8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-22, -9); ctx.quadraticCurveTo(0, 0, 22, -9); ctx.stroke(); }
    if (type === "drum") { ctx.strokeStyle = "#e5e8ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-28, -4); ctx.lineTo(-17, 5); ctx.moveTo(28, -4); ctx.lineTo(17, 5); ctx.stroke(); }
    if (type === "petal") { ctx.strokeStyle = "#fff2f8"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(0, 17); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.stroke(); }
    if (this.shieldActive) {
      ctx.globalAlpha = 0.72; ctx.strokeStyle = "#a8d8ff"; ctx.shadowColor = "#78b8ff"; ctx.shadowBlur = 16; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.slowTimer > 0) {
      const pulse = 1 + Math.sin(this.age * 11) * 0.08;
      ctx.globalAlpha = 0.9; ctx.globalCompositeOperation = "lighter"; ctx.shadowColor = "#a5f6ec"; ctx.shadowBlur = 18; ctx.strokeStyle = "#bafcff"; ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(0, 0, (this.radius + 9) * pulse, -this.age * 2.2, -this.age * 2.2 + Math.PI * 1.7); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = "#6de4e8"; ctx.lineWidth = 1.4;
      for (let index = 0; index < 4; index += 1) {
        const angle = this.age * 1.6 + index * Math.PI / 2;
        const x = Math.cos(angle) * (this.radius + 11); const y = Math.sin(angle) * (this.radius + 11);
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(4, 0); ctx.lineTo(0, 4); ctx.lineTo(-4, 0); ctx.closePath(); ctx.stroke(); ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    if (this.dashTime > 0 || this.bossChargeTime > 0) {
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "#ffb6cf"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, this.radius + 8); ctx.lineTo(0, this.radius + 26); ctx.stroke();
    }
    if (this.maxHp > 1) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,.22)";
      ctx.fillRect(-18, -31, 36, 3);
      ctx.fillStyle = "#f5b4ff";
      ctx.fillRect(-18, -31, 36 * Math.max(0, this.hp / this.maxHp), 3);
    }
    if (this.silenceTimer > 0) {
      ctx.globalAlpha = 0.98; ctx.strokeStyle = "#9ef8ff"; ctx.shadowBlur = 14; ctx.shadowColor = "#55eaff"; ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(0, 0, this.radius + 8 + Math.sin(this.age * 8) * 2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#d7ffff"; ctx.font = "700 9px system-ui"; ctx.textAlign = "center"; ctx.fillText("SILENCE", 0, -this.radius - 10);
    }
    if (this.burn) {
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.9; ctx.shadowColor = "#ff2f25"; ctx.shadowBlur = 16; ctx.strokeStyle = "#ff4632"; ctx.fillStyle = "#ffd05a"; ctx.lineWidth = 2;
      for (const side of [-1, 1]) { const x = side * (this.radius * .56); ctx.beginPath(); ctx.moveTo(x, this.radius * .55); ctx.quadraticCurveTo(x + side * 5, this.radius * .05, x, -this.radius * .9); ctx.quadraticCurveTo(x - side * 5, -this.radius * .35, x, -this.radius * 1.35); ctx.stroke(); ctx.beginPath(); ctx.arc(x, -this.radius * .9, 2.5 + Math.sin(this.age * 12 + side) * 1.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalCompositeOperation = "source-over";
    }
    if (this.azureShrinkTimer > 0) {
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.9; ctx.shadowColor = "#78dfff"; ctx.shadowBlur = 16; ctx.strokeStyle = "#baf7ff"; ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(0, 0, this.radius + 10 + Math.sin(this.age * 10) * 2, -this.age * 1.5, -this.age * 1.5 + Math.PI * 1.55); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalCompositeOperation = "source-over";
    }
    if (this.featherMarkHits > 0) {
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.88; ctx.shadowColor = "#ff8a42"; ctx.shadowBlur = 12; ctx.strokeStyle = "#ffd06a"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 7, this.age * 3, this.age * 3 + Math.PI * 1.3); ctx.stroke();
      ctx.fillStyle = "#ff9a45"; ctx.beginPath(); ctx.arc(0, -this.radius - 7, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = "source-over";
    }
    if (this.featherBurstTimer > 0) {
      const progress = 1 - this.featherBurstTimer / 0.34;
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1 - progress; ctx.shadowColor = "#ffca63"; ctx.shadowBlur = 18; ctx.strokeStyle = "#ff8a42"; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 8 + progress * 20, 0, Math.PI * 2); ctx.stroke(); ctx.globalCompositeOperation = "source-over";
    }
    if (this.obsidianCuts.length > 0) {
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.85; ctx.shadowColor = "#8e72ff"; ctx.shadowBlur = 14; ctx.strokeStyle = "#d8d0ff"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-this.radius * .72, -this.radius * .8); ctx.lineTo(this.radius * .72, this.radius * .8); ctx.moveTo(this.radius * .6, -this.radius * .9); ctx.lineTo(-this.radius * .6, this.radius * .9); ctx.stroke(); ctx.globalCompositeOperation = "source-over";
    }
    if (this.darkErosionMarks > 0) {
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.92; ctx.shadowColor = "#9d2639"; ctx.shadowBlur = 16; ctx.strokeStyle = "#d55b78"; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(0, 0, this.radius + 8 + Math.sin(this.age * 9) * 1.5, this.age * 2.6, this.age * 2.6 + Math.PI * 1.35); ctx.stroke(); ctx.setLineDash([]);
      for (let index = 0; index < Math.min(3, this.darkErosionMarks); index += 1) { const angle = this.age * 1.8 + index * Math.PI * 2 / 3; ctx.fillStyle = index % 2 ? "#ff8aa0" : "#9d2639"; ctx.beginPath(); ctx.arc(Math.cos(angle) * (this.radius + 8), Math.sin(angle) * (this.radius + 8), 2.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#ffd6e0"; ctx.font = "800 8px system-ui"; ctx.textAlign = "center"; ctx.fillText(String(this.darkErosionMarks), 0, -this.radius - 12); ctx.globalCompositeOperation = "source-over";
    }
    if (this.summoned) {
      ctx.globalAlpha = 0.72; ctx.strokeStyle = "#ff5c92"; ctx.shadowColor = "#ff3c70"; ctx.shadowBlur = 12; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 5 + Math.sin(this.age * 9) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}
