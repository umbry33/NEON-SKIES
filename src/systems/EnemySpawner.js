import { ENEMY_CONFIG } from "../config/enemy-config.js";
import { Enemy } from "../entities/Enemy.js";

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.spawnWeight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.spawnWeight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

export class EnemySpawner {
  constructor({ width, config, pool = ENEMY_CONFIG }) {
    this.width = width;
    this.config = config;
    this.pool = pool;
    this.timer = 0.25;
  }

  update(dt, elapsedSeconds) {
    this.timer -= dt;
    if (this.timer > 0) return null;
    const stage = this.config.fixed ? 0 : Math.floor(elapsedSeconds / this.config.stageDuration);
    const interval = this.config.fixed ? this.config.spawnInterval : Math.max(this.config.minimumSpawnInterval, this.config.spawnInterval - stage * 0.08);
    this.timer = interval;
    const definition = weightedPick(this.pool);
    const x = definition.radius + Math.random() * (this.width - definition.radius * 2);
    return new Enemy(definition, x, {
      speedMultiplier: this.config.fixed ? (this.config.speedMultiplier ?? 1) : 1 + stage * this.config.speedMultiplierStep,
      hpMultiplier: this.config.fixed ? (this.config.hpMultiplier ?? 1) : 1 + stage * this.config.hpMultiplierStep,
    });
  }
}
