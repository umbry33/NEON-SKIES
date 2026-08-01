export class Decoy {
  constructor(player, duration) {
    this.x = player.x;
    this.y = player.y;
    this.stats = { ...player.stats };
    this.loadout = player.loadout;
    this.duration = duration;
    this.weaponTimers = new Map();
    this.activeWhirlwinds = new Map();
    this.whirlwindCooldowns = new Map();
    this.damageMultiplier = 0.3;
    this.alive = true;
  }

  update(dt) {
    this.duration -= dt;
    this.alive = this.duration > 0;
    for (const [slotId, timer] of this.weaponTimers) this.weaponTimers.set(slotId, timer - dt);
    for (const [slotId, timer] of this.whirlwindCooldowns) {
      const next = timer - dt;
      if (next <= 0) this.whirlwindCooldowns.delete(slotId); else this.whirlwindCooldowns.set(slotId, next);
    }
  }

  canFireWeapon(slotId) { return (this.weaponTimers.get(slotId) ?? 0) <= 0; }
  canFireWhirlwind(slotId) { return (this.whirlwindCooldowns.get(slotId) ?? 0) <= 0; }
  armWeapon(slotId, seconds) { this.weaponTimers.set(slotId, seconds); }
}
