import { ENEMY_CONFIG, ADVANCED_ENEMY_CONFIG } from "./enemy-config.js";

const poolForLevel = (number) => {
  const pool = [...ENEMY_CONFIG];
  if (number >= 3) pool.push({ ...ENEMY_CONFIG[1], spawnWeight: 4 });
  if (number >= 7) pool.push(ADVANCED_ENEMY_CONFIG[0]);
  if (number >= 13) pool.push({ ...ENEMY_CONFIG[2], spawnWeight: 2 });
  if (number >= 19) pool.push(ADVANCED_ENEMY_CONFIG[1]);
  return pool;
};

const createLevel = (number) => ({
  number,
  id: `level-${number}`,
  name: `${number % 5 === 0 ? "Boss" : "Level"} ${number}`,
  boss: number % 5 === 0,
  targetScore: 650 + number * 140,
  enemyPool: poolForLevel(number),
  hpMultiplier: 1 + (number - 1) * 0.08,
  speedMultiplier: 1 + (number - 1) * 0.035,
  spawnInterval: Math.max(0.24, 0.86 - (number - 1) * 0.018),
  minimumSpawnInterval: 0.22,
});

export const LEVELS = Array.from({ length: 25 }, (_, index) => createLevel(index + 1));
export const getLevelConfig = (number) => LEVELS[Math.max(1, Math.min(25, Number(number) || 1)) - 1];
export const MODE_CONFIG = {
  endless: { id: "endless", name: "ENDLESS", subtitle: "ENDLESS" },
  levels: { id: "levels", name: "MISSIONS", subtitle: "MISSION SELECT" },
};

export const LEVEL_CONFIG = {
  name: "Neon Training",
  background: { top: "#071b35", bottom: "#030914" },
  difficulty: { stageDuration: 12, spawnInterval: 0.88, minimumSpawnInterval: 0.25, speedMultiplierStep: 0.08, hpMultiplierStep: 0.06 },
};
