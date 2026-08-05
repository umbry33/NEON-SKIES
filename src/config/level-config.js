import { ENEMY_CONFIG, ADVANCED_ENEMY_CONFIG, ENABLED_PROTOTYPE_ENEMY_CONFIG } from "./enemy-config.js";
import { getEnvironmentPool } from "./environment-config.js";

const poolForLevel = (number) => {
  const pool = [...ENEMY_CONFIG];
  if (number >= 3) pool.push({ ...ENEMY_CONFIG[1], spawnWeight: 4 });
  if (number >= 7) pool.push(ADVANCED_ENEMY_CONFIG[0]);
  if (number >= 13) pool.push({ ...ENEMY_CONFIG[2], spawnWeight: 2 });
  if (number >= 19) pool.push(ADVANCED_ENEMY_CONFIG[1]);
  if (number >= 26) pool.push(ADVANCED_ENEMY_CONFIG[2]);
  if (number >= 31) pool.push(ADVANCED_ENEMY_CONFIG[3]);
  if (number >= 37) pool.push(ADVANCED_ENEMY_CONFIG[4]);
  if (number >= 51) pool.push(...ENABLED_PROTOTYPE_ENEMY_CONFIG);
  return pool;
};

const createLevel = (number) => {
  const progress = (number - 1) / 99;
  return {
    number,
    id: `level-${number}`,
    name: `${number % 5 === 0 ? "Boss" : "Level"} ${number}`,
    boss: number % 5 === 0,
    targetScore: 650 + number * 140 + Math.max(0, number - 25) * 45,
    enemyPool: poolForLevel(number),
    // The final mission is tuned to the same core pressure as Beyond Lv.4.
    hpMultiplier: +(1 + progress * 1.32).toFixed(2),
    speedMultiplier: +(1 + progress * 0.42).toFixed(2),
    damageMultiplier: +(1 + progress * 0.92).toFixed(2),
    spawnInterval: +(0.86 - progress * 0.38).toFixed(2),
    minimumSpawnInterval: 0.22,
    environmentPool: getEnvironmentPool(number),
    environment: number >= 26 ? { firstDelay: 7, interval: Math.max(11, 19 - Math.floor((number - 26) / 5)) } : null,
  };
};

export const LEVELS = Array.from({ length: 100 }, (_, index) => createLevel(index + 1));
export const getLevelConfig = (number) => LEVELS[Math.max(1, Math.min(100, Number(number) || 1)) - 1];
export const MODE_CONFIG = {
  endless: { id: "endless", name: "ENDLESS", subtitle: "ENDLESS" },
  levels: { id: "levels", name: "MISSIONS", subtitle: "MISSION SELECT" },
};

export const LEVEL_CONFIG = {
  name: "Neon Training",
  background: { top: "#071b35", bottom: "#030914" },
  difficulty: { stageDuration: 12, spawnInterval: 0.88, minimumSpawnInterval: 0.25, speedMultiplierStep: 0.08, hpMultiplierStep: 0.06 },
};
