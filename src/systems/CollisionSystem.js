import { GAME_CONFIG } from "../config/game-config.js";

export function circleIntersects(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) <= (a.radius ?? 0) + (b.radius ?? 0); }
export function circleRectIntersects(circle, rect) { const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width)); const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height)); return Math.hypot(circle.x - closestX, circle.y - closestY) <= circle.radius; }

export class CollisionSystem {
  resolve({ player, enemies, projectiles, wingman = null, lasers = [], freezeActive = false, ionSaw = null, statusDamageEvents = [] }) {
    const removedProjectiles = new Set(); const destroyedEnemies = new Set(); const damageEvents = []; const explosionEvents = []; let score = 0; let playerDamage = 0; let playerHealing = 0;
    const playerParts = typeof player?.getCollisionParts === "function" ? player.getCollisionParts() : [player];
    const intersectsPlayer = (entity) => playerParts.some((part) => circleIntersects(entity, part));
    const addDamage = (enemy, amount, element = "neutral") => { if (!enemy || destroyedEnemies.has(enemy)) return; damageEvents.push({ x: enemy.x, y: enemy.y, amount, element }); if (enemy.takeDamage(amount)) { destroyedEnemies.add(enemy); score += enemy.definition.score; } };
    const pointOf = (entity) => ({ x: entity.x, y: entity.y });
    const isVisibleEnemy = (enemy) => enemy?.x >= 0 && enemy.x <= GAME_CONFIG.canvas.width && enemy.y >= 0 && enemy.y <= GAME_CONFIG.canvas.height;
    const chainFrom = (projectile, first, sourceEntity) => {
      if (!first || !isVisibleEnemy(first) || !sourceEntity) return;
      const queue = [{ enemy: first, fromEntity: sourceEntity }];
      projectile.chainVisited ??= new Set(); projectile.chainLinks ??= [];
      while (queue.length) {
        const { enemy, fromEntity } = queue.shift();
        if (projectile.chainVisited.has(enemy.id) || enemy.hp <= 0) continue;
        projectile.chainVisited.add(enemy.id);
        addDamage(enemy, projectile.currentDamage, projectile.element);
        projectile.chainLinks.push({ fromEntity, toEntity: enemy, from: pointOf(fromEntity), to: pointOf(enemy) });
        for (const nearby of enemies) {
          if (nearby !== enemy && isVisibleEnemy(nearby) && nearby.hp > 0 && !projectile.chainVisited.has(nearby.id) && Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) <= projectile.chainRadius) {
            queue.push({ enemy: nearby, fromEntity: enemy });
          }
        }
      }
    };
    for (const statusEvent of statusDamageEvents) addDamage(statusEvent.enemy, statusEvent.amount, statusEvent.element ?? "fire");

    for (const projectile of projectiles) {
      if (projectile.blackHoleCapturedBy) continue;
      if ((projectile.polarityDelay ?? 0) > 0) continue;
      if (projectile.team === "player") {
        if (projectile.kind === "blackHole") {
          const field = projectile.blackHole ?? {};
          if (projectile.life <= 0 && !field.exploded) {
            field.exploded = true; const captured = [...(field.capturedProjectiles ?? [])]; const radius = field.explosionRadius ?? 37;
            explosionEvents.push({ x: projectile.x, y: projectile.y, radius, color: projectile.color, kind: "blackHole", capturedCount: captured.length, life: 0.5, maxLife: 0.5 });
            for (const capturedProjectile of captured) {
              removedProjectiles.add(capturedProjectile);
              const damage = Math.max(0, capturedProjectile.damage ?? 0);
              for (const enemy of enemies) if (!destroyedEnemies.has(enemy) && !enemy.isPhased && Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) <= radius) addDamage(enemy, damage, capturedProjectile.element ?? "neutral");
            }
            removedProjectiles.add(projectile);
          }
          continue;
        }
        if (projectile.kind === "electricWhirlwind") {
          if (projectile.active !== false && (projectile.whirlwind?.damageTimer ?? 0) <= 0) {
            for (const enemy of enemies) if (!destroyedEnemies.has(enemy) && !enemy.isPhased && circleIntersects(projectile, enemy)) addDamage(enemy, projectile.damage, projectile.element);
            projectile.whirlwind.damageTimer = projectile.whirlwind.damageInterval ?? 0.1;
          }
          continue;
        }
        if (projectile.kind === "chainLightning") {
          if (!projectile.chainProcessed) {
            const visibleEnemies = enemies.filter(isVisibleEnemy);
            const first = projectile.target?.hp > 0 && isVisibleEnemy(projectile.target) ? projectile.target : visibleEnemies.filter((enemy) => enemy.hp > 0 && enemy.y < projectile.y).sort((a, b) => Math.hypot(a.x - projectile.x, a.y - projectile.y) - Math.hypot(b.x - projectile.x, b.y - projectile.y))[0] ?? visibleEnemies.filter((enemy) => enemy.hp > 0).sort((a, b) => Math.hypot(a.x - projectile.x, a.y - projectile.y) - Math.hypot(b.x - projectile.x, b.y - projectile.y))[0];
            chainFrom(projectile, first, projectile.chainSource ?? player); projectile.chainProcessed = true;
          }
          continue;
        }
        for (const enemy of enemies) {
          if (destroyedEnemies.has(enemy) || enemy.isPhased || removedProjectiles.has(projectile) || !projectile.canHit(enemy) || !circleIntersects(projectile, enemy)) continue;
          projectile.registerHit(enemy); addDamage(enemy, projectile.currentDamage, projectile.element);
          if (projectile.burn) enemy.applyBurn(projectile.burn);
          if (projectile.slow) enemy.applySlow(projectile.slow);
          if (projectile.explosionRadius) {
            explosionEvents.push({ x: enemy.x, y: enemy.y, radius: projectile.explosionRadius, color: projectile.color, kind: projectile.kind, life: 0.38, maxLife: 0.38 });
            const explosionDamage = projectile.explosionDamage ?? projectile.currentDamage;
            for (const nearby of enemies) if (nearby !== enemy && !destroyedEnemies.has(nearby) && Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) <= projectile.explosionRadius) addDamage(nearby, explosionDamage, projectile.element);
          }
          if (projectile.chainRadius) chainFrom(projectile, enemy, player);
          if (projectile.kind === "ball") enemy.silence(1.5);
          if (projectile.bounce) { projectile.vx *= -1; projectile.vy *= 0.96; }
          if (!projectile.pierce && !projectile.bounce && !projectile.boomerang) removedProjectiles.add(projectile);
        }
        if (projectile.whiteHoleHealState && intersectsPlayer(projectile)) {
          removedProjectiles.add(projectile);
          const heal = Math.min(Math.max(0, projectile.damage ?? 0), Math.max(0, projectile.whiteHoleHealState.remaining ?? 0));
          projectile.whiteHoleHealState.remaining = Math.max(0, (projectile.whiteHoleHealState.remaining ?? 0) - heal); playerHealing += heal;
        }
      } else if (!freezeActive) {
        if (wingman?.active && circleIntersects(projectile, wingman)) { wingman.damage(projectile.damage); removedProjectiles.add(projectile); }
        else if (intersectsPlayer(projectile)) {
          removedProjectiles.add(projectile);
          if (projectile.whiteHoleHealState) {
            const heal = Math.min(Math.max(0, projectile.damage ?? 0), Math.max(0, projectile.whiteHoleHealState.remaining ?? 0));
            projectile.whiteHoleHealState.remaining = Math.max(0, (projectile.whiteHoleHealState.remaining ?? 0) - heal); playerHealing += heal;
          } else playerDamage += projectile.damage;
        }
      }
    }
    for (const laser of lasers) if (laser.life > 0) for (const enemy of enemies) if (!destroyedEnemies.has(enemy) && !enemy.isPhased && !laser.hitIds.has(enemy.id) && Math.abs(enemy.y - laser.y) <= enemy.radius + laser.thickness) { laser.hitIds.add(enemy.id); addDamage(enemy, laser.damage, laser.element ?? "electric"); }
    let sawHitCount = 0;
    let sawProjectileCount = 0;
    if (ionSaw?.active && ionSaw.damageTimer <= 0) {
      const reach = ionSaw.reach ?? 42;
      const radius = ionSaw.radius ?? 26;
      for (const enemy of enemies) {
        if (destroyedEnemies.has(enemy) || enemy.isPhased || enemy.hp <= 0) continue;
        const nearBlade = Math.hypot(enemy.x - (player.x - reach), enemy.y - player.y) <= enemy.radius + radius || Math.hypot(enemy.x - (player.x + reach), enemy.y - player.y) <= enemy.radius + radius;
        if (nearBlade) { addDamage(enemy, ionSaw.damage); sawHitCount += 1; }
      }
      for (const projectile of projectiles) {
        if (projectile.team !== "enemy" || projectile.blackHoleCapturedBy || removedProjectiles.has(projectile)) continue;
        const projectileRadius = projectile.radius ?? 0;
        const nearBlade = Math.hypot(projectile.x - (player.x - reach), projectile.y - player.y) <= projectileRadius + radius || Math.hypot(projectile.x - (player.x + reach), projectile.y - player.y) <= projectileRadius + radius;
        if (nearBlade) { removedProjectiles.add(projectile); sawProjectileCount += 1; }
      }
    }
    // 机体碰撞只造成接触伤害，敌机仍然留在场上；只有玩家武器造成的伤害才能销毁敌机。
    if (!freezeActive) for (const enemy of enemies) if (!destroyedEnemies.has(enemy) && intersectsPlayer(enemy)) playerDamage += GAME_CONFIG.projectile.enemyContactDamage;
    return { removedProjectiles, destroyedEnemies, score, playerDamage, playerHealing, damageEvents, explosionEvents, sawHitCount, sawProjectileCount, sawTriggered: Boolean(ionSaw?.active && ionSaw.damageTimer <= 0) };
  }
}
