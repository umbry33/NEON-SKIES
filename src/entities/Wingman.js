import { Projectile } from "./Projectile.js";
import { GAME_CONFIG } from "../config/game-config.js";

export class Wingman {
  constructor(player) {
    this.x = player.x - 42;
    this.y = player.y + 4;
    this.hp = 10;
    this.maxHp = 10;
    this.age = 0;
    this.attackSpeed = Math.min(GAME_CONFIG.player.maxAttackSpeed, Math.max(0.01, player.stats?.attackSpeed ?? GAME_CONFIG.player.attackSpeed));
    this.fireTimer = 0;
    this.respawnTimer = 0;
  }

  get active() { return this.respawnTimer <= 0 && this.hp > 0; }

  update(dt, player, bounds) {
    this.age += dt;
    if (!this.active) { this.respawnTimer -= dt; if (this.respawnTimer <= 0) { this.hp = this.maxHp; this.x = player.x - 42; this.y = player.y + 4; } return; }
    const targetX = player.x + Math.sin(this.age * 1.7) * 46;
    const targetY = player.y + 20 + Math.cos(this.age * 1.2) * 16;
    this.x += (targetX - this.x) * Math.min(1, dt * 4);
    this.y += (targetY - this.y) * Math.min(1, dt * 4);
    this.x = Math.max(20, Math.min(bounds.width - 20, this.x));
    this.y = Math.max(50, Math.min(bounds.height - 30, this.y));
    this.fireTimer -= dt;
  }

  fire() {
    if (!this.active || this.fireTimer > 0) return null;
    this.fireTimer = (1 / 3) / this.attackSpeed;
    return new Projectile({ x: this.x, y: this.y - 12, vx: 0, vy: -560, damage: 2, radius: 3, color: "#b9f8ff", life: 2, team: "player", kind: "bolt" });
  }

  damage(amount) { if (!this.active) return; this.hp = Math.max(0, this.hp - amount); if (this.hp === 0) this.respawnTimer = 10; }

  draw(ctx) {
    if (!this.active) return;
    ctx.save(); ctx.translate(this.x, this.y); ctx.globalAlpha = 0.9; ctx.shadowBlur = 14; ctx.shadowColor = "#b9f8ff"; ctx.fillStyle = "#b9f8ff";
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(11, 9); ctx.lineTo(0, 5); ctx.lineTo(-11, 9); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
