import { ASSEMBLY_BOARD, getFootprintBounds, getInstalledEntries } from "../config/module-config.js";
import { GAME_CONFIG } from "../config/game-config.js";
import { drawModuleIcon } from "../rendering/ModuleRenderer.js";

const PLAYER_DRAW_SCALE = 0.85;

export class Player {
  constructor({ x, y, stats, loadout }) {
    this.x = x;
    this.y = y;
    this.stats = stats;
    this.loadout = loadout;
    this.radius = GAME_CONFIG.player.radius;
    this.installedEntries = getInstalledEntries(loadout);
    this.collisionCells = this.buildCollisionCells();
    this.collisionBounds = this.getCollisionBounds();
    // 自动模块不一定会直接开火（例如能量聚合器），只有声明攻击行为的模块才进入开火队列。
    this.weaponEntries = this.installedEntries.filter(({ module }) => module?.type === "weapon" && module.behavior?.type);
    this.hp = Math.round(stats.maxHp);
    this.weaponTimers = new Map();
    this.activeWhirlwinds = new Map();
    this.whirlwindCooldowns = new Map();
    this.hitFlash = 0;
    this.invulnerabilityTimer = 0;
    this.overclockTimer = 0;
    this.weaponSilenceTimer = 0;
    // 避免大量自动模块在倒计时结束的同一帧同时开火，降低首帧弹幕峰值。
    this.weaponEntries.forEach((entry, index) => this.weaponTimers.set(entry.slotId, Math.min(0.45, (index % 10) * 0.045)));
  }

  // 每一个已占用网格都是机体的一部分，战斗碰撞不再只取核心圆点。
  buildCollisionCells() {
    const cells = new Map();
    for (const entry of this.installedEntries) {
      for (const [offsetX, offsetY] of entry.module?.footprint?.cells ?? [[0, 0]]) {
        const x = entry.x + offsetX;
        const y = entry.y + offsetY;
        const key = `${x}:${y}`;
        const radius = entry.module?.type === "core" ? 11 : 8;
        const current = cells.get(key);
        if (!current || radius > current.radius) cells.set(key, { x, y, radius });
      }
    }
    const core = ASSEMBLY_BOARD.corePosition;
    return [...cells.values()].map((cell) => ({
      offsetX: (cell.x - core.x) * GAME_CONFIG.player.moduleSpacing,
      offsetY: (cell.y - core.y) * GAME_CONFIG.player.moduleSpacing,
      radius: cell.radius,
    }));
  }

  getCollisionBounds() {
    const parts = this.collisionCells.length ? this.collisionCells : [{ offsetX: 0, offsetY: 0, radius: this.radius }];
    return {
      minX: Math.min(...parts.map((part) => part.offsetX - part.radius)),
      maxX: Math.max(...parts.map((part) => part.offsetX + part.radius)),
      minY: Math.min(...parts.map((part) => part.offsetY - part.radius)),
      maxY: Math.max(...parts.map((part) => part.offsetY + part.radius)),
    };
  }

  getCollisionParts() {
    return this.collisionCells.map((part) => ({ x: this.x + part.offsetX, y: this.y + part.offsetY, radius: part.radius }));
  }

  update(dt, input, bounds, movementMultiplier = 1) {
    if (input.pointer.active) {
      const target = input.pointer;
      this.x += (target.x - this.x) * Math.min(1, dt * 15);
      this.y += (target.y - this.y) * Math.min(1, dt * 15);
    } else {
      const movement = input.getMovementVector();
      this.x += movement.x * this.stats.moveSpeed * movementMultiplier * dt;
      this.y += movement.y * this.stats.moveSpeed * movementMultiplier * dt;
    }
    this.x = Math.max(5 - this.collisionBounds.minX, Math.min(bounds.width - 5 - this.collisionBounds.maxX, this.x));
    this.y = Math.max(45 - this.collisionBounds.minY, Math.min(bounds.height - 10 - this.collisionBounds.maxY, this.y));
    for (const [slotId, timer] of this.weaponTimers) this.weaponTimers.set(slotId, timer - dt);
    for (const [slotId, timer] of this.whirlwindCooldowns) {
      const next = timer - dt;
      if (next <= 0) this.whirlwindCooldowns.delete(slotId); else this.whirlwindCooldowns.set(slotId, next);
    }
    this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.overclockTimer = Math.max(0, this.overclockTimer - dt);
    this.weaponSilenceTimer = Math.max(0, this.weaponSilenceTimer - dt);
  }

  canFireWeapon(slotId) { return (this.weaponTimers.get(slotId) ?? 0) <= 0; }
  canFireWhirlwind(slotId) { return (this.whirlwindCooldowns.get(slotId) ?? 0) <= 0; }
  armWeapon(slotId, seconds) { this.weaponTimers.set(slotId, seconds); }

  damage(amount) {
    if (this.invulnerabilityTimer > 0) return false;
    this.hp = Math.round(Math.max(0, this.hp - Math.max(0, Number(amount) || 0)));
    this.invulnerabilityTimer = 1;
    this.hitFlash = 1;
    return this.hp <= 0;
  }

  draw(ctx, { x = this.x, y = this.y, alpha = 1, damageMultiplier = 1, hitFlash = this.hitFlash } = {}) {
    ctx.save();
    ctx.translate(x, y);
    // 只缩小绘制结果；碰撞范围、移动边界和模块装配坐标保持原有规则。
    ctx.scale(PLAYER_DRAW_SCALE, PLAYER_DRAW_SCALE);
    const blinking = this.invulnerabilityTimer > 0 && Math.floor(this.invulnerabilityTimer * 12) % 2 === 0;
    const blinkAlpha = blinking ? 0.28 : 1;
    ctx.globalAlpha = alpha * blinkAlpha;
    const flashColor = hitFlash > 0 ? "#ff6a8e" : null;
    const core = ASSEMBLY_BOARD.corePosition;
    const entries = this.installedEntries;

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
