import { ASSEMBLY_BOARD, getInstalledEntries, getModuleById, getModuleElement } from "../config/module-config.js";
import { hasActiveSynergy } from "../config/synergy-config.js";
import { Projectile } from "../entities/Projectile.js";
import { GAME_CONFIG } from "../config/game-config.js";

function vectorFromAngle(angle, speed = 0) { return { vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed }; }

function makePlayerProjectile(player, projectile, angle = 0, options = {}) {
  const velocity = vectorFromAngle(angle, projectile.speed);
  const originX = options.originX ?? player.x;
  const originY = options.originY ?? player.y;
  const damageMultiplier = options.damageMultiplier ?? 1;
  return new Projectile({
    x: originX + (options.offsetX ?? 0), y: originY - 8 + (options.offsetY ?? 0), ...velocity,
    damage: projectile.damage * damageMultiplier, damageEnd: typeof projectile.damageEnd === "number" ? projectile.damageEnd * damageMultiplier : undefined,
    radius: projectile.radius, color: projectile.color, life: projectile.chainLife ?? projectile.life, team: "player", kind: options.kind ?? "bolt",
    homing: options.homing, homingDelay: projectile.homingDelay, homingTurnRate: projectile.homingTurnRate, target: options.target, pierce: options.pierce ?? projectile.pierce, bounce: options.bounce ?? projectile.bounce,
    explosionRadius: projectile.explosionRadius, explosionDamage: projectile.explosionDamage, chainRadius: projectile.chainRadius, chainLife: projectile.chainLife, chainFlashDuration: projectile.flashDuration, chainSource: options.chainSource, growthRate: projectile.growthRate, boomerang: options.boomerang, whirlwind: options.whirlwind, blackHole: options.blackHole ?? projectile.blackHole, element: projectile.element ?? options.element ?? "neutral", burn: projectile.burn,
  });
}

function moduleOrigin(player, entry) {
  const core = ASSEMBLY_BOARD.corePosition;
  return { originX: player.x + (entry.x - core.x) * GAME_CONFIG.player.moduleSpacing, originY: player.y + (entry.y - core.y) * GAME_CONFIG.player.moduleSpacing };
}

function nearestEnemy(enemies, x, y) { return enemies.filter((enemy) => enemy.hp > 0).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] ?? null; }
function nearestForwardEnemy(enemies, x, y) { const visible = enemies.filter((enemy) => enemy.hp > 0 && enemy.x >= 0 && enemy.x <= GAME_CONFIG.canvas.width && enemy.y >= 0 && enemy.y <= GAME_CONFIG.canvas.height); const ahead = visible.filter((enemy) => enemy.y < y); return nearestEnemy(ahead.length ? ahead : visible, x, y); }
export function getPlayerAttackSpeed(player) { const base = (player?.stats?.attackSpeed ?? GAME_CONFIG.player.attackSpeed) * (player?.environmentAttackSpeedMultiplier ?? 1); const overclockBonus = player?.overclockTimer > 0 ? 0.8 : 0; const cap = GAME_CONFIG.player.maxAttackSpeed + (player?.overclockTimer > 0 ? 0.8 : 0); return Math.min(cap, Math.max(0.01, base + overclockBonus)); }
function attackSpeedOf(player) { return getPlayerAttackSpeed(player); }

function angleDistance(a, b) {
  let delta = Math.abs(a - b) % (Math.PI * 2);
  return delta > Math.PI ? Math.PI * 2 - delta : delta;
}

function distributedTargets(enemies, count, origin, spreadAngle) {
  const available = enemies.filter((enemy) => enemy.hp > 0);
  const unused = new Set(available);
  return Array.from({ length: count }, (_, index) => {
    const launchAngle = (index - (count - 1) / 2) * spreadAngle;
    const pool = unused.size ? [...unused] : available;
    const target = pool.sort((a, b) => {
      const angleA = Math.atan2(a.x - origin.originX, -(a.y - origin.originY));
      const angleB = Math.atan2(b.x - origin.originX, -(b.y - origin.originY));
      return angleDistance(angleA, launchAngle) - angleDistance(angleB, launchAngle);
    })[0] ?? null;
    if (target) unused.delete(target);
    return target;
  });
}

function waterFireSynergyActive(player) {
  return hasActiveSynergy(player?.loadout, "synergy-water-fire");
}

export function createNestVolley(origin, behavior, enemies, damageMultiplier = 1) {
  const spreadAngle = behavior.spreadAngle ?? 0.18;
  const targets = distributedTargets(enemies, behavior.volley, origin, spreadAngle);
  const source = { x: origin.originX, y: origin.originY };
  return Array.from({ length: behavior.volley }, (_, index) => {
    const angle = (index - (behavior.volley - 1) / 2) * spreadAngle;
    return makePlayerProjectile(source, behavior.projectile, angle, { ...origin, kind: "nestMissile", homing: true, target: targets[index], damageMultiplier });
  });
}

const behaviors = {
  single: (player, behavior, enemies, entry, damageMultiplier) => [makePlayerProjectile(player, behavior.projectile, 0, { ...moduleOrigin(player, entry), damageMultiplier })],
  twin: (player, behavior, enemies, entry, damageMultiplier) => {
    const origin = moduleOrigin(player, entry);
    return [
      makePlayerProjectile(player, behavior.projectile, 0, { ...origin, offsetX: -behavior.offset, damageMultiplier }),
      makePlayerProjectile(player, behavior.projectile, 0, { ...origin, offsetX: behavior.offset, damageMultiplier }),
    ];
  },
  spread: (player, behavior, enemies, entry, damageMultiplier) => behavior.angles.map((angle) => makePlayerProjectile(player, behavior.projectile, angle, { ...moduleOrigin(player, entry), damageMultiplier })),
  missile: (player, behavior, enemies, entry, damageMultiplier) => [makePlayerProjectile(player, behavior.projectile, 0, { ...moduleOrigin(player, entry), kind: "missile", homing: true, target: nearestEnemy(enemies, player.x, player.y), damageMultiplier })],
  boomerang: (player, behavior, enemies, entry, damageMultiplier) => [makePlayerProjectile(player, behavior.projectile, 0, { ...moduleOrigin(player, entry), kind: "boomerang", pierce: true, boomerang: { topTurnY: 8, speed: behavior.projectile.speed }, damageMultiplier })],
  electricWhirlwind: (player, behavior, enemies, entry, damageMultiplier, attackSpeed) => {
    const origin = moduleOrigin(player, entry);
    const target = nearestEnemy(enemies, origin.originX, origin.originY);
    const angle = target ? Math.atan2(target.x - origin.originX, -(target.y - origin.originY)) : 0;
    const projectile = makePlayerProjectile(player, behavior.projectile, angle, { ...origin, kind: "electricWhirlwind", pierce: true, whirlwind: { speed: behavior.projectile.speed, returnSpeed: behavior.projectile.speed, returnTimeout: behavior.projectile.returnTimeout, emergencyReturnSpeed: behavior.projectile.emergencyReturnSpeed, damageInterval: behavior.damageInterval / attackSpeed, returnTarget: player, returnSlotId: entry.slotId, returnOffsetX: origin.originX - player.x, returnOffsetY: origin.originY - player.y - 8, captureRadius: behavior.projectile.returnCaptureRadius, rearmDelay: behavior.projectile.rearmDelay / attackSpeed }, damageMultiplier });
    player.activeWhirlwinds ??= new Map(); player.activeWhirlwinds.set(entry.slotId, projectile);
    return [projectile];
  },
  nest: (player, behavior, enemies, entry, damageMultiplier) => createNestVolley(moduleOrigin(player, entry), behavior, enemies, damageMultiplier),
  ricochet: (player, behavior, enemies, entry, damageMultiplier) => [makePlayerProjectile(player, behavior.projectile, (Math.random() - 0.5) * 0.6, { ...moduleOrigin(player, entry), bounce: true, pierce: true, damageMultiplier })],
  ballLightning: (player, behavior, enemies, entry, damageMultiplier) => [makePlayerProjectile(player, behavior.projectile, 0, { ...moduleOrigin(player, entry), kind: "ball", pierce: true, damageMultiplier })],
  psionic: (player, behavior, enemies, entry, damageMultiplier) => [makePlayerProjectile(player, behavior.projectile, 0, { ...moduleOrigin(player, entry), kind: "psionic", pierce: false, damageMultiplier })],
  flameCrossbow: (player, behavior, enemies, entry, damageMultiplier) => {
    if (waterFireSynergyActive(player) && Math.random() < 0.25) {
      const water = getModuleById("weapon-water-shot")?.behavior?.projectile;
      if (water) return [-0.1, 0, 0.1].map((angle) => makePlayerProjectile(player, { ...water, element: "water" }, angle, { ...moduleOrigin(player, entry), kind: "waterShot", damageMultiplier }));
    }
    return behavior.angles.map((angle) => makePlayerProjectile(player, behavior.projectile, angle, { ...moduleOrigin(player, entry), kind: "flameArrow", damageMultiplier }));
  },
  waterShot: (player, behavior, enemies, entry, damageMultiplier) => {
    if (waterFireSynergyActive(player) && Math.random() < 0.75) {
      const water = behavior.projectile;
      const burn = getModuleById("weapon-flame-crossbow")?.behavior?.projectile?.burn;
      return [makePlayerProjectile(player, { ...water, color: "#ff3344", element: "fire", burn }, 0, { ...moduleOrigin(player, entry), kind: "waterShot", damageMultiplier })];
    }
    return [makePlayerProjectile(player, behavior.projectile, 0, { ...moduleOrigin(player, entry), kind: "waterShot", damageMultiplier })];
  },
  lightning: (player, behavior, enemies, entry, damageMultiplier) => {
    const origin = moduleOrigin(player, entry);
    const target = nearestForwardEnemy(enemies, origin.originX, origin.originY);
    const chainSource = { x: origin.originX, y: origin.originY - 8 };
    return [makePlayerProjectile(player, behavior.projectile, 0, { ...origin, kind: "chainLightning", target, chainSource, pierce: true, damageMultiplier })];
  },
  blackHole: (player, behavior, enemies, entry, damageMultiplier) => [makePlayerProjectile(player, behavior.projectile, 0, { ...moduleOrigin(player, entry), kind: "blackHole", blackHole: { ...behavior.projectile.blackHole }, damageMultiplier })],
};

export class WeaponSystem {
  fireWingmanNest(wingman, enemies) {
    const behavior = getModuleById("weapon-nest")?.behavior;
    if (!behavior || !wingman?.canFireNest?.()) return [];
    wingman.armNest(behavior.fireInterval ?? 6);
    return createNestVolley({ originX: wingman.x, originY: wingman.y - 4 }, { ...behavior, projectile: { ...behavior.projectile, element: getModuleElement("weapon-nest") } }, enemies);
  }

  firePlayer(player, enemies, { damageMultiplier = 1 } = {}) {
    const projectiles = [];
    if ((player?.weaponSilenceTimer ?? 0) > 0) return projectiles;
    const attackSpeed = attackSpeedOf(player);
    const weaponEntries = player.weaponEntries ?? getInstalledEntries(player.loadout).filter(({ module }) => module?.type === "weapon" && module.behavior?.type);
    const psionicCount = weaponEntries.filter(({ module }) => module.behavior?.stackKey === "psionic").length;
    for (const entry of weaponEntries) {
      const behavior = entry.module.behavior;
      if (!behavior || !entry.module) continue;
      const factory = behaviors[behavior.type];
      if (!factory || !player.canFireWeapon(entry.slotId)) continue;
      if (behavior.type === "electricWhirlwind") {
        const active = player.activeWhirlwinds?.get(entry.slotId);
        if (active && active.active !== false && active.life > 0) continue;
        if (active) player.activeWhirlwinds.delete(entry.slotId);
        if (player.canFireWhirlwind && !player.canFireWhirlwind(entry.slotId)) continue;
      }
      const baseInterval = behavior.stackKey === "psionic" ? behavior.stackedIntervals[Math.min(2, Math.max(0, psionicCount - 1))] : (behavior.fireInterval ?? (behavior.fireRate ? 1 / behavior.fireRate : 0.5));
      player.armWeapon(entry.slotId, baseInterval / attackSpeed);
      projectiles.push(...factory(player, { ...behavior, projectile: { ...behavior.projectile, element: getModuleElement(entry.module) } }, enemies, entry, damageMultiplier, attackSpeed));
    }
    return projectiles;
  }

  fireEnemy(enemy, player) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const length = Math.hypot(dx, dy) || 1;
    const base = Math.atan2(dx, -dy);
    const speed = GAME_CONFIG.projectile.enemySpeed * (enemy.environmentProjectileSpeedMultiplier ?? 1);
    const makeShot = (angle = base, kind = "enemyBolt") => new Projectile({
      x: enemy.x, y: enemy.y + enemy.radius * 0.7, vx: Math.sin(angle) * speed,
      vy: -Math.cos(angle) * speed, damage: GAME_CONFIG.projectile.enemyDamage * (enemy.damageMultiplier ?? 1),
      radius: enemy.boss ? 7 : GAME_CONFIG.projectile.enemyRadius, color: enemy.boss ? (enemy.definition.color ?? "#ff3c70") : "#ff638c", life: GAME_CONFIG.projectile.enemyLife, team: "enemy", kind,
    });
    if (!enemy.boss) {
      if (enemy.definition.attackPattern === "burst") return [-0.22, 0, 0.22].map((offset) => makeShot(base + offset, "burstBolt"));
      return makeShot(Math.PI);
    }
    if (enemy.definition.attackPattern === "radial") {
      const count = 10 + Math.min(6, Math.floor(enemy.level / 10));
      return Array.from({ length: count }, (_, index) => makeShot((Math.PI * 2 * index) / count, "bossRadial"));
    }
    if (enemy.definition.attackPattern === "ring") {
      const count = 8 + Math.min(6, Math.floor(enemy.level / 8));
      const phase = enemy.age * .7;
      return Array.from({ length: count }, (_, index) => makeShot(phase + (Math.PI * 2 * index) / count, "bossRing"));
    }
    if (enemy.definition.attackPattern === "spiral") {
      const phase = enemy.age * 2.8;
      return [-.42, 0, .42].map((offset) => makeShot(phase + offset, "bossSpiral"));
    }
    if (enemy.definition.attackPattern === "cross") {
      return [-Math.PI / 2, 0, Math.PI / 2, Math.PI].map((offset) => makeShot(base + offset, "bossCross"));
    }
    if (enemy.definition.attackPattern === "lance") {
      return [-.1, 0, .1].map((offset) => makeShot(base + offset, "bossLance"));
    }
    const count = 5 + Math.min(4, Math.floor(enemy.level / 5));
    return Array.from({ length: count }, (_, index) => {
      const spread = (index - (count - 1) / 2) * 0.14;
      return makeShot(base + spread, "bossBolt");
    });
  }
}
