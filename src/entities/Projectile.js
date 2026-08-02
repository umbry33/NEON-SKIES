function drawJaggedBolt(ctx, from, to, seed = 0) {
  const dx = to.x - from.x; const dy = to.y - from.y; const length = Math.hypot(dx, dy) || 1;
  const px = -dy / length; const py = dx / length; const segments = Math.max(4, Math.min(10, Math.floor(length / 18)));
  const points = [{ x: from.x, y: from.y }];
  for (let index = 1; index < segments; index += 1) {
    const ratio = index / segments;
    // 大段落、低频率偏移，形成参考图中的自然弯折，而不是密集的锯齿。
    const wave = Math.sin(seed * 13.7 + index * 2.35) * 0.62 + Math.sin(seed * 4.1 + index * 0.91) * 0.38;
    const bend = wave * Math.min(26, length * 0.16) * (0.78 + Math.sin(ratio * Math.PI) * 0.22);
    points.push({ x: from.x + dx * ratio + px * bend, y: from.y + dy * ratio + py * bend });
  }
  points.push({ x: to.x, y: to.y });
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
  ctx.stroke();
}

export class Projectile {
  constructor({ x, y, vx = 0, vy = 0, damage, damageEnd, radius, color, life, chainLife = null, chainFlashDuration = 0.045, team, homing = false, homingDelay = 0, homingTurnRate = 2.4, target = null, chainSource = null, kind = "bolt", pierce = false, bounce = false, explosionRadius = 0, chainRadius = 0, growthRate = 2.2, boomerang = null, whirlwind = null, blackHole = null, polarityDelay = 0, dodgeMotion = null }) {
    Object.assign(this, { x, y, vx, vy, damage, damageEnd, radius, color, life, chainLife, chainFlashDuration, team, homing, homingDelay, homingTurnRate, target, chainSource, kind, pierce, bounce, explosionRadius, chainRadius, growthRate, boomerang, whirlwind, blackHole, polarityDelay, dodgeMotion });
    this.age = 0;
    this.origin = { x, y };
    this.phase = 0;
    this.hitKeys = new Set();
    this.chainVisited = new Set();
    this.chainLinks = [];
    this.active = true;
    if (this.blackHole) this.blackHole.damageTimer = this.blackHole.damageInterval ?? 0;
  }

  get currentDamage() {
    if (typeof this.damageEnd !== "number") return this.damage;
    const progress = Math.min(1, this.age / Math.max(0.01, this.boomerang?.growthDuration ?? 4));
    return this.damage + (this.damageEnd - this.damage) * progress;
  }

  canHit(enemy) { return !this.hitKeys.has(enemy.id ?? enemy); }
  registerHit(enemy) { const id = enemy.id ?? enemy; if (this.hitKeys.has(id)) return false; this.hitKeys.add(id); return true; }

  updateChainLinks() {
    for (const link of this.chainLinks) {
      if (link.fromEntity) link.from = { x: link.fromEntity.x, y: link.fromEntity.y };
      if (link.toEntity) link.to = { x: link.toEntity.x, y: link.toEntity.y };
    }
  }

  update(dt, enemies = [], bounds = null) {
    this.age += dt;
    this.life -= dt;
    this.updateChainLinks();
    if (this.blackHoleCapturedBy) {
      const orbit = this.blackHoleOrbit;
      if (orbit) {
        orbit.angle += orbit.speed * dt;
        this.x = this.blackHoleCapturedBy.x + Math.cos(orbit.angle) * orbit.radius;
        this.y = this.blackHoleCapturedBy.y + Math.sin(orbit.angle) * orbit.radius;
      } else {
        this.x = this.blackHoleCapturedBy.x;
        this.y = this.blackHoleCapturedBy.y;
      }
      this.vx = 0;
      this.vy = 0;
      return;
    }
    if (this.blackHole) this.blackHole.damageTimer = Math.max(0, (this.blackHole.damageTimer ?? 0) - dt);
    if (this.homing && this.age >= this.homingDelay) {
      const target = this.target?.hp > 0 ? this.target : enemies.filter((enemy) => enemy.hp > 0).sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0];
      if (target) {
        this.target = target;
        const desired = Math.atan2(target.x - this.x, -(target.y - this.y));
        const current = Math.atan2(this.vx, -this.vy);
        let delta = desired - current;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const angle = current + Math.max(-this.homingTurnRate * dt, Math.min(this.homingTurnRate * dt, delta));
        const speed = Math.hypot(this.vx, this.vy);
        this.vx = Math.sin(angle) * speed;
        this.vy = -Math.cos(angle) * speed;
      }
    }
    if (this.boomerang) {
      this.vx = 0;
      this.vy = this.phase === 0 ? -Math.abs(this.boomerang.speed ?? Math.abs(this.vy)) : Math.abs(this.boomerang.speed ?? Math.abs(this.vy));
      if (this.phase === 0 && this.y - this.radius <= (this.boomerang.topTurnY ?? 8)) {
        this.phase = 1;
        this.hitKeys.clear();
      }
    } else if (this.whirlwind) {
      this.whirlwind.damageTimer = Math.max(0, (this.whirlwind.damageTimer ?? 0) - dt);
      if (this.phase === 0) {
        const hitEdge = bounds && (
          this.x - this.radius <= 0 || this.x + this.radius >= bounds.width
          || this.y - this.radius <= 0 || this.y + this.radius >= bounds.height
        );
        const fallbackTop = !bounds && this.y - this.radius <= (this.whirlwind.topTurnY ?? 8);
        if (hitEdge || fallbackTop) {
          this.phase = 1;
          this.whirlwind.returnAge = 0;
        }
      } else {
        this.whirlwind.returnAge = (this.whirlwind.returnAge ?? 0) + dt;
        const target = this.whirlwind.returnTarget;
        const targetX = (target?.x ?? this.x) + (this.whirlwind.returnOffsetX ?? 0);
        const targetY = (target?.y ?? this.y) + (this.whirlwind.returnOffsetY ?? 0);
        const dx = targetX - this.x; const dy = targetY - this.y; const distance = Math.hypot(dx, dy) || 1;
        if (distance <= (this.whirlwind.captureRadius ?? 14)) {
          this.x = targetX; this.y = targetY; this.vx = 0; this.vy = 0; this.active = false; this.life = 0;
          if (target?.whirlwindCooldowns && this.whirlwind.returnSlotId) target.whirlwindCooldowns.set(this.whirlwind.returnSlotId, this.whirlwind.rearmDelay ?? 2);
        } else {
          const normalSpeed = Math.abs(this.whirlwind.returnSpeed ?? this.whirlwind.speed ?? 300);
          const emergencySpeed = Math.abs(this.whirlwind.emergencyReturnSpeed ?? normalSpeed * 4);
          const speed = this.whirlwind.returnAge > (this.whirlwind.returnTimeout ?? 3) ? emergencySpeed : normalSpeed;
          this.vx = dx / distance * speed; this.vy = dy / distance * speed;
        }
      }
    }
    const movementScale = this.blackHole?.slowed ? (this.blackHole.slowSpeedMultiplier ?? 0.035) : 1;
    this.x += this.vx * dt * movementScale;
    this.y += this.vy * dt * movementScale;
    if (this.dodgeMotion?.type === "sine") {
      const frequency = this.dodgeMotion.frequency ?? 1;
      const phase = this.dodgeMotion.phase ?? 0;
      const previous = Math.sin((this.age - dt) * frequency + phase);
      const current = Math.sin(this.age * frequency + phase);
      this.x += (current - previous) * (this.dodgeMotion.amplitude ?? 0);
    }
    if (this.bounce && bounds) {
      if (this.x <= this.radius || this.x >= bounds.width - this.radius) { this.vx *= -1; this.x = Math.max(this.radius, Math.min(bounds.width - this.radius, this.x)); }
      if (this.y <= this.radius || this.y >= bounds.height - this.radius) { this.vy *= -1; this.y = Math.max(this.radius, Math.min(bounds.height - this.radius, this.y)); }
    }
  }

  isOffscreen(width, height) {
    if (this.active === false) return true;
    if (this.bounce) return this.life <= 0;
    return this.life <= 0 || this.x < -50 || this.x > width + 50 || this.y < -60 || this.y > height + 60;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowBlur = ["missile", "nestMissile"].includes(this.kind) ? 22 : 14;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    if (["missile", "nestMissile", "boomerang", "electricWhirlwind"].includes(this.kind)) {
      if (this.kind === "electricWhirlwind") {
        const size = this.radius;
        ctx.save(); ctx.rotate(this.age * 4.5); ctx.strokeStyle = this.color; ctx.lineCap = "round"; ctx.lineWidth = 3; ctx.shadowBlur = 24;
        for (const offset of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) { ctx.beginPath(); ctx.arc(0, 0, size * 0.66, offset, offset + 1.8); ctx.stroke(); }
        ctx.restore();
      } else if (this.kind === "boomerang") {
        ctx.lineWidth = 3; ctx.strokeStyle = this.color;
        ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(0, 6); ctx.lineTo(8, -6); ctx.stroke();
      } else if (this.kind === "nestMissile") {
        ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 2);
        const width = Math.max(10, this.radius * 0.86); const length = Math.max(30, this.radius * 3.2);
        ctx.shadowBlur = 28; ctx.shadowColor = "#ff173f";
        ctx.fillStyle = "#090b13"; ctx.strokeStyle = "#ff294d"; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -length / 2); ctx.lineTo(width * 0.42, -length * 0.18); ctx.lineTo(width / 2, length * 0.23);
        ctx.lineTo(width * 0.28, length / 2); ctx.lineTo(-width * 0.28, length / 2); ctx.lineTo(-width / 2, length * 0.23);
        ctx.lineTo(-width * 0.42, -length * 0.18); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ef294d"; ctx.fillRect(-2.4, -length * 0.28, 4.8, length * 0.62);
        ctx.fillStyle = "#ff9baa"; ctx.fillRect(-1, -length * 0.33, 2, length * 0.28);
        ctx.fillStyle = "#05060b"; ctx.strokeStyle = "#d7193f"; ctx.lineWidth = 1.6;
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * width * 0.36, length * 0.08); ctx.lineTo(side * width * 0.78, length * 0.32); ctx.lineTo(side * width * 0.28, length * 0.28); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = "#ff3b55"; ctx.beginPath(); ctx.arc(0, length * 0.44, width * 0.2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 2);
        const missileWidth = Math.max(4, this.radius * 0.8); const missileLength = Math.max(18, this.radius * 3);
        ctx.fillRect(-missileWidth / 2, -missileLength / 2, missileWidth, missileLength); ctx.fillStyle = "#fff0c2"; ctx.fillRect(-missileWidth * 0.25, missileLength / 2 - 1, missileWidth * 0.5, missileWidth);
      }
    } else if (this.kind === "blackHole") {
      const fieldRadius = this.blackHole?.pullRadius ?? this.radius;
      const pulse = 1 + Math.sin(this.age * 7) * 0.025;
      ctx.globalCompositeOperation = "lighter"; ctx.shadowColor = "#9d63ff"; ctx.shadowBlur = 30;
      ctx.globalAlpha = 0.08; ctx.fillStyle = "#8e50e8"; ctx.beginPath(); ctx.arc(0, 0, fieldRadius * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.strokeStyle = "#9d63ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, fieldRadius * pulse, this.age * 1.4, this.age * 1.4 + Math.PI * 1.72); ctx.stroke();
      ctx.globalAlpha = 0.45; ctx.strokeStyle = "#d0b0ff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, fieldRadius * 0.93 * pulse, -this.age * 1.9, -this.age * 1.9 + Math.PI * 1.25); ctx.stroke();
      ctx.globalAlpha = 1; ctx.shadowBlur = 32; ctx.fillStyle = "#080414"; ctx.beginPath(); ctx.arc(0, 0, this.radius * (1 + Math.sin(this.age * 9) * 0.06), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#f0dcff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, this.radius * 1.45, this.age * 3, this.age * 3 + Math.PI * 1.45); ctx.stroke();
    } else if (this.kind === "dodgeOrb") {
      const pulse = 1 + Math.sin(this.age * 8) * 0.12;
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.92; ctx.beginPath(); ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.52; ctx.strokeStyle = "#fff1ff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, this.radius * 1.65, 0, Math.PI * 2); ctx.stroke();
    } else if (this.kind === "dodgeShard") {
      ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 2); ctx.fillStyle = this.color; ctx.beginPath(); ctx.moveTo(0, -this.radius * 1.9); ctx.lineTo(this.radius, 0); ctx.lineTo(0, this.radius * 1.9); ctx.lineTo(-this.radius, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#f5eaff"; ctx.lineWidth = 1; ctx.stroke();
    } else if (this.kind === "dodgeLine") {
      ctx.rotate(Math.atan2(this.vy, this.vx)); ctx.fillStyle = this.color; ctx.globalAlpha = 0.9; ctx.fillRect(-this.radius * 2.8, -2, this.radius * 5.6, 4); ctx.globalAlpha = 0.3; ctx.fillRect(-this.radius * 4.2, -1, this.radius * 8.4, 2);
    } else if (this.kind === "dodgeRing") {
      ctx.rotate(this.age * 3); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = this.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, this.radius * 1.8, 0, Math.PI * 1.35); ctx.stroke(); ctx.strokeStyle = "#fff5cf"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.8, Math.PI, Math.PI * 2.35); ctx.stroke();
    } else if (this.kind === "dodgeWave") {
      ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 2); ctx.fillStyle = this.color; ctx.beginPath(); ctx.moveTo(0, -this.radius * 1.8); ctx.lineTo(this.radius * 1.4, this.radius * 1.3); ctx.lineTo(0, this.radius * 0.7); ctx.lineTo(-this.radius * 1.4, this.radius * 1.3); ctx.closePath(); ctx.fill();
    } else if (this.kind === "bossBolt") {
      ctx.rotate(Math.atan2(this.vy, this.vx)); ctx.fillStyle = "#160914"; ctx.strokeStyle = "#ff557c"; ctx.lineWidth = 2; ctx.shadowBlur = 25;
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(0, -5); ctx.lineTo(11, 0); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffb0bd"; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
    } else if (this.kind === "ball") {
      const size = this.radius + Math.min(20, this.age * this.growthRate);
      ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.globalAlpha = 0.55; ctx.stroke();
    } else if (this.kind === "chainLightning") {
      const links = this.chainLinks ?? [];
      const fade = this.chainLife ? Math.pow(Math.max(0, Math.min(1, this.life / this.chainLife)), 1.35) : 1;
      const flash = this.chainFlashDuration > 0 ? Math.max(0, 1 - this.age / this.chainFlashDuration) : 0;
      ctx.save(); ctx.shadowBlur = 14 + flash * 18; ctx.shadowColor = this.color; ctx.strokeStyle = this.color; ctx.lineCap = "round"; ctx.lineJoin = "miter"; ctx.globalAlpha = Math.min(1, fade * (0.9 + flash * 0.1)); ctx.lineWidth = 3.1 + flash * 1.9;
      links.forEach((link, index) => drawJaggedBolt(ctx, { x: link.from.x - this.x, y: link.from.y - this.y }, { x: link.to.x - this.x, y: link.to.y - this.y }, index + 30 + this.age * 0.8));
      ctx.globalAlpha = Math.min(1, fade * (0.9 + flash * 0.1)); ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 16 + flash * 14; ctx.shadowColor = "#e8c8ff"; for (const link of links) { for (const point of [link.from, link.to]) { ctx.beginPath(); ctx.arc(point.x - this.x, point.y - this.y, 3.5 + flash * 3, 0, Math.PI * 2); ctx.fill(); } }
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
