import { ASSEMBLY_BOARD, getFootprintBounds, getInstalledEntries } from "../config/module-config.js";
import { GAME_CONFIG } from "../config/game-config.js";
import { drawModuleIcon } from "../rendering/ModuleRenderer.js";

export class Player {
  constructor({ x, y, stats, loadout }) {
    this.x = x;
    this.y = y;
    this.stats = stats;
    this.loadout = loadout;
    this.hp = stats.maxHp;
    this.radius = GAME_CONFIG.player.radius;
    this.weaponTimers = new Map();
    this.activeWhirlwinds = new Map();
    this.whirlwindCooldowns = new Map();
    this.hitFlash = 0;
    this.invulnerabilityTimer = 0;
  }

  update(dt, input, bounds) {
    if (input.pointer.active) {
      const target = input.pointer;
      this.x += (target.x - this.x) * Math.min(1, dt * 15);
      this.y += (target.y - this.y) * Math.min(1, dt * 15);
    } else {
      const movement = input.getMovementVector();
      this.x += movement.x * this.stats.moveSpeed * dt;
      this.y += movement.y * this.stats.moveSpeed * dt;
    }
    this.x = Math.max(this.radius + 5, Math.min(bounds.width - this.radius - 5, this.x));
    this.y = Math.max(this.radius + 45, Math.min(bounds.height - this.radius - 10, this.y));
    for (const [slotId, timer] of this.weaponTimers) this.weaponTimers.set(slotId, timer - dt);
    for (const [slotId, timer] of this.whirlwindCooldowns) {
      const next = timer - dt;
      if (next <= 0) this.whirlwindCooldowns.delete(slotId); else this.whirlwindCooldowns.set(slotId, next);
    }
    this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
  }

  canFireWeapon(slotId) { return (this.weaponTimers.get(slotId) ?? 0) <= 0; }
  canFireWhirlwind(slotId) { return (this.whirlwindCooldowns.get(slotId) ?? 0) <= 0; }
  armWeapon(slotId, seconds) { this.weaponTimers.set(slotId, seconds); }

  damage(amount) {
    if (this.invulnerabilityTimer > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerabilityTimer = 1;
    this.hitFlash = 1;
    return this.hp <= 0;
  }

  draw(ctx, { x = this.x, y = this.y, alpha = 1, damageMultiplier = 1, hitFlash = this.hitFlash } = {}) {
    ctx.save();
    ctx.translate(x, y);
    const blinking = this.invulnerabilityTimer > 0 && Math.floor(this.invulnerabilityTimer * 12) % 2 === 0;
    const blinkAlpha = blinking ? 0.28 : 1;
    ctx.globalAlpha = alpha * blinkAlpha;
    const flashColor = hitFlash > 0 ? "#ff6a8e" : null;
    const core = ASSEMBLY_BOARD.corePosition;
    const entries = getInstalledEntries(this.loadout);

    // The player is rendered as the actual module assembly; there is no default blue aircraft sprite.
    for (const entry of entries) {
      const footprint = getFootprintBounds(entry.module);
      const dx = entry.x + (footprint.minX + footprint.maxX) / 2 - core.x;
      const dy = entry.y + (footprint.minY + footprint.maxY) / 2 - core.y;
      ctx.save();
      ctx.translate(dx * GAME_CONFIG.player.moduleSpacing, dy * GAME_CONFIG.player.moduleSpacing);
      if (flashColor) ctx.globalAlpha = alpha * blinkAlpha * 0.75;
      if (entry.module.type === "core") drawModuleIcon(ctx, entry.module, 24, flashColor ? 0.8 : damageMultiplier);
      else {
        ctx.scale(footprint.width * 0.72, footprint.height * 0.72);
        drawModuleIcon(ctx, entry.module, 18, flashColor ? 0.8 : damageMultiplier);
      }
      ctx.restore();
    }
    ctx.restore();
  }
}
