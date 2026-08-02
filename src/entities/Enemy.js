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
  }

  update(dt, bounds = { width: 480 }) {
    if (this.frozen) return;
    this.age += dt;
    if (this.boss) {
      this.bossChargeTimer -= dt;
      if (this.bossChargeTimer <= 0 && this.definition.dashInterval) {
        this.bossChargeTime = this.definition.dashDuration ?? 0.5;
        this.bossChargeTimer = this.definition.dashInterval;
      }
      this.bossChargeTime = Math.max(0, this.bossChargeTime - dt);
      const movement = this.bossChargeTime > 0 ? 1.85 : 0.9;
      this.x = bounds.width / 2 + Math.sin(this.age * movement) * bounds.width * (this.bossChargeTime > 0 ? 0.43 : 0.32);
      this.y = 118 + Math.sin(this.age * 1.55) * 66;
    } else {
      this.dashTimer -= dt;
      if (this.definition.movement === "dash" && this.dashTimer <= 0) {
        this.dashTime = this.definition.dashDuration ?? 0.6;
        this.dashTimer = this.definition.dashInterval ?? 3;
      }
      this.dashTime = Math.max(0, this.dashTime - dt);
      const speed = this.speed * this.environmentSpeedMultiplier * (this.dashTime > 0 ? (this.definition.dashMultiplier ?? 2.6) : 1);
      this.y += speed * dt;
      if (this.definition.movement === "sine") this.x = this.baseX + Math.sin(this.age * 3.2) * 38;
      if (this.definition.movement === "orbit") this.x = this.baseX + Math.sin(this.age * 2.1) * 70;
      if (this.definition.movement === "zigzag") this.x = this.baseX + Math.sin(this.age * 4.6) * 64;
      this.isPhased = this.definition.ability === "phase" && Math.sin(this.age * 2.5) > 0.45;
      if (this.definition.ability === "shield") {
        const cycle = this.definition.shieldCycle ?? 4;
        this.shieldActive = (this.age % cycle) < (this.definition.shieldDuration ?? 1.4);
      }
    }
    this.shootTimer -= dt;
    this.silenceTimer = Math.max(0, this.silenceTimer - dt);
  }

  canShoot() {
    if (this.shootTimer > 0 || this.silenceTimer > 0 || this.frozen) return false;
    this.shootTimer = this.definition.shootInterval * this.environmentShootIntervalMultiplier;
    return true;
  }

  takeDamage(amount) {
    this.hp -= this.shieldActive ? amount * 0.35 : amount;
    return this.hp <= 0;
  }

  silence(seconds) { this.silenceTimer = Math.max(this.silenceTimer, seconds); }

  draw(ctx) {
    const { type, color } = this.definition;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = this.isPhased ? 0.28 : 1;
    ctx.rotate(type === "swift" ? Math.sin(this.age * 4) * 0.18 : 0);
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (this.boss) {
      ctx.moveTo(0, -48); ctx.lineTo(38, -20); ctx.lineTo(48, 18); ctx.lineTo(20, 42); ctx.lineTo(-20, 42); ctx.lineTo(-48, 18); ctx.lineTo(-38, -20);
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
    } else {
      ctx.moveTo(0, 21); ctx.lineTo(16, -8); ctx.lineTo(6, -5); ctx.lineTo(0, -18); ctx.lineTo(-6, -5); ctx.lineTo(-16, -8);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#241b3a";
    ctx.beginPath(); ctx.arc(0, 0, type === "guardian" ? 7 : 5, 0, Math.PI * 2); ctx.fill();
    if (this.boss) {
      ctx.shadowBlur = 12; ctx.strokeStyle = "#ff496e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 57 + Math.sin(this.age * 5) * 3, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.shieldActive) {
      ctx.globalAlpha = 0.72; ctx.strokeStyle = "#a8d8ff"; ctx.shadowColor = "#78b8ff"; ctx.shadowBlur = 16; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2); ctx.stroke();
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
    if (this.summoned) {
      ctx.globalAlpha = 0.72; ctx.strokeStyle = "#ff5c92"; ctx.shadowColor = "#ff3c70"; ctx.shadowBlur = 12; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 5 + Math.sin(this.age * 9) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}
