export const ENEMY_CONFIG = [
  { id: "enemy-scout", name: "Scout", type: "scout", hp: 5, speed: 116, radius: 16, score: 100, color: "#ff6f9f", spawnWeight: 6, shootInterval: 2.4, movement: "straight" },
  { id: "enemy-swift", name: "Swift", type: "swift", hp: 10, speed: 188, radius: 14, score: 160, color: "#ffbd6b", spawnWeight: 3, shootInterval: 2.8, movement: "sine" },
  { id: "enemy-guardian", name: "Guardian", type: "guardian", hp: 20, speed: 72, radius: 23, score: 340, color: "#b67cff", spawnWeight: 1, shootInterval: 1.8, movement: "straight" },
];

// Advanced enemies are unlocked by later stages, while endless mode keeps its
// original three-enemy pool.
export const ADVANCED_ENEMY_CONFIG = [
  { id: "enemy-orbit", name: "Orbit", type: "orbit", hp: 26, speed: 86, radius: 19, score: 430, color: "#61f5d1", spawnWeight: 2, shootInterval: 1.6, movement: "orbit", ability: "orbit" },
  { id: "enemy-phantom", name: "Phantom", type: "phantom", hp: 34, speed: 102, radius: 18, score: 580, color: "#ff75df", spawnWeight: 1, shootInterval: 1.3, movement: "phase", ability: "phase" },
  { id: "enemy-striker", name: "Striker", type: "striker", hp: 30, speed: 136, radius: 18, score: 520, color: "#ff8f5e", spawnWeight: 2, shootInterval: 2.1, movement: "zigzag", ability: "burst", attackPattern: "burst" },
  { id: "enemy-bulwark", name: "Bulwark", type: "bulwark", hp: 52, speed: 68, radius: 25, score: 780, color: "#77a8ff", spawnWeight: 1, shootInterval: 1.65, movement: "straight", ability: "shield", shieldCycle: 3.8, shieldDuration: 1.45 },
  { id: "enemy-rammer", name: "Rammer", type: "rammer", hp: 38, speed: 108, radius: 20, score: 640, color: "#ff587b", spawnWeight: 1, shootInterval: 2.7, movement: "dash", ability: "dash", dashInterval: 3.4, dashDuration: 0.62, dashMultiplier: 3.2 },
];

export function createBossDefinition(level = 5) {
  const summonPool = level >= 20
    ? level >= 35
      ? ["enemy-bulwark", "enemy-striker", "enemy-rammer", "enemy-phantom"]
      : ["enemy-guardian", "enemy-orbit", "enemy-phantom"]
    : level >= 10
      ? ["enemy-swift", "enemy-guardian", "enemy-orbit"]
      : ["enemy-scout", "enemy-swift", "enemy-guardian"];
  return {
    id: `boss-${level}`, name: `Boss ${level}`, type: "boss", boss: true,
    hp: 170 + level * 34, speed: 0, radius: 48, score: 2600 + level * 240,
    color: "#ff3c70", spawnWeight: 0, shootInterval: Math.max(0.7, 1.5 - level * 0.02), movement: "boss",
    summon: { interval: Math.max(2.8, 5.8 - level * 0.07), maxActive: 3 + Math.floor(level / 8), count: level >= 15 ? 2 : 1, pool: summonPool },
    attackPattern: level >= 40 ? "radial" : "fan",
    bossSkills: level >= 45 ? ["radial", "charge", "summon"] : level >= 30 ? ["fan", "charge", "summon"] : ["fan", "summon"],
    dashInterval: level >= 30 ? Math.max(3.4, 6.4 - level * 0.05) : 0,
    dashDuration: 0.5,
  };
}

export function getEnemyById(id) { return [...ENEMY_CONFIG, ...ADVANCED_ENEMY_CONFIG].find((enemy) => enemy.id === id) ?? null; }
