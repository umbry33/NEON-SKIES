export const ENEMY_CONFIG = [
  { id: "enemy-scout", name: "Scout", type: "scout", hp: 5, speed: 116, radius: 16, score: 100, color: "#ff6f9f", spawnWeight: 6, shootInterval: 2.4, movement: "straight" },
  { id: "enemy-swift", name: "Swift", type: "swift", hp: 5, speed: 188, radius: 14, score: 160, color: "#ffbd6b", spawnWeight: 3, shootInterval: 2.8, movement: "sine" },
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

// Archive-only prototypes. They are intentionally excluded from every spawn
// pool and getEnemyById(), so no current mode can generate them.
export const UNRELEASED_ENEMY_CONFIG = [
  { id: "enemy-prism-splitter", name: "\u68f1\u955c\u5206\u88c2\u8005", type: "prism", hp: 18, speed: 104, radius: 18, score: 360, color: "#7ef8ff", mechanic: "\u53d1\u5c04\u4e00\u679a\u68f1\u955c\u5f39\uff0c\u77ed\u6682\u6ed1\u884c\u540e\u5206\u88c2\u4e3a\u5de6\u53f3\u4e24\u679a\u659c\u5411\u5b50\u5f39\u3002" },
  { id: "enemy-anchor-layer", name: "\u951a\u94fe\u6295\u653e\u8005", type: "anchor", hp: 30, speed: 68, radius: 22, score: 540, color: "#ffc66d", mechanic: "\u901a\u8fc7\u540e\u4f1a\u6295\u4e0b\u4e00\u679a\u7f13\u901f\u7684\u951a\u70b9\uff0c\u951a\u70b9\u5ef6\u8fdf\u7206\u5f00\u4e3a\u5c0f\u5706\u73af\u5f39\u5e55\u3002" },
  { id: "enemy-echo-glider", name: "\u56de\u58f0\u6ed1\u7fd4\u673a", type: "echo", hp: 22, speed: 128, radius: 17, score: 420, color: "#d2a6ff", mechanic: "\u6bcf\u6b21\u5c04\u51fb\u540e\uff0c\u4f1a\u5728\u539f\u8f68\u8ff9\u4e0a\u7559\u4e0b\u4e00\u53d1\u5ef6\u8fdf\u540c\u6b65\u7684\u201c\u56de\u58f0\u5f39\u201d\u3002" },
  { id: "enemy-loom-wasp", name: "\u7ec7\u5e55\u9ec4\u8702", type: "loom", hp: 24, speed: 96, radius: 19, score: 460, color: "#ffb52e", mechanic: "\u53cc\u53d1\u5b50\u5f39\u4ece\u4e24\u4fa7\u98de\u51fa\uff0c\u4f1a\u5728\u524d\u65b9\u4ea4\u53c9\uff0c\u7f16\u7ec7\u51fa\u4e00\u4e2a\u77ed\u6682\u7684\u7a7f\u884c\u7f1d\u9699\u3002" },
  { id: "enemy-firefly-lantern", name: "\u8424\u706b\u706f\u7b3c", type: "lantern", hp: 28, speed: 78, radius: 21, score: 500, color: "#c9ff77", mechanic: "\u8eab\u65c1\u7684\u4e24\u53ea\u8424\u706b\u4f1a\u7ed5\u884c\uff0c\u968f\u540e\u4e00\u524d\u4e00\u540e\u91ca\u653e\u4e3a\u7f13\u901f\u5149\u70b9\u3002" },
  { id: "enemy-comet-courier", name: "\u5f57\u5c3e\u4fe1\u4f7f", type: "comet", visualType: "comet", flipY: true, hp: 16, speed: 168, radius: 16, score: 380, color: "#74c7ff", mechanic: "\u9ad8\u901f\u4e0b\u63a0\u65f6\u4f1a\u62d6\u51fa\u4e09\u679a\u9010\u6e10\u4f11\u6b62\u7684\u5f57\u5c3e\u5b50\u5f39\uff0c\u8feb\u4f7f\u73a9\u5bb6\u63d0\u524d\u6362\u7ebf\u3002" },
  { id: "enemy-pendulum-beacon", name: "\u949f\u6446\u4fe1\u6807", type: "pendulum", visualType: "pendulum", flipY: true, hp: 34, speed: 58, radius: 24, score: 620, color: "#ffae8a", mechanic: "\u4ee5\u949f\u6446\u8282\u594f\u5411\u5de6\u53f3\u4ea4\u66ff\u629b\u51fa\u5f27\u7ebf\u5f39\uff0c\u5f39\u9053\u9ad8\u4f4e\u4ea4\u66ff\u3002" },
  { id: "enemy-ribbon-ray", name: "\u7f0e\u5e26\u9cd0", type: "ribbon", visualType: "ribbon", flipY: true, hp: 20, speed: 112, radius: 20, score: 440, color: "#6dffe7", mechanic: "\u5f20\u5f00\u7f0e\u5e26\u7ffc\u65f6\u4f1a\u8fde\u7eed\u5c04\u51fa\u7f13\u6162\u6446\u52a8\u7684\u6ce2\u6d6a\u5f39\uff0c\u6bcf\u53d1\u504f\u79fb\u65b9\u5411\u4e0d\u540c\u3002" },
  { id: "enemy-polar-drummer", name: "\u6781\u6027\u9f13\u624b", type: "drum", hp: 32, speed: 82, radius: 23, score: 590, color: "#9fa9ff", mechanic: "\u6bcf\u4e24\u6b21\u5c04\u51fb\u4ea4\u66ff\u4e3a\u5feb\u901f\u7a7f\u523a\u5f39\u4e0e\u7f13\u901f\u9f13\u70b9\u5f39\uff0c\u5f62\u6210\u5bb9\u6613\u8bb0\u5fc6\u7684\u5feb\u6162\u8282\u594f\u3002" },
  { id: "enemy-petal-minelayer", name: "\u7efd\u653e\u7684\u82b1\u857e", type: "petal", visualType: "petal", flipY: true, hp: 26, speed: 88, radius: 21, score: 520, color: "#ff91b7", mechanic: "\u6295\u4e0b\u4e00\u4e2a\u82b1\u857e\u6838\uff0c\u77ed\u6682\u540e\u5411\u56db\u4e2a\u5bf9\u89d2\u65b9\u5411\u5c55\u5f00\u82b1\u74e3\u5f39\u3002" },
];

export function createBossDefinition(level = 5, variantId = null) {
  const summonPool = level >= 20
    ? level >= 35
      ? ["enemy-bulwark", "enemy-striker", "enemy-rammer", "enemy-phantom"]
      : ["enemy-guardian", "enemy-orbit", "enemy-phantom"]
    : level >= 10
      ? ["enemy-swift", "enemy-guardian", "enemy-orbit"]
      : ["enemy-scout", "enemy-swift", "enemy-guardian"];
  const variants = {
    "storm-warden": { name: "雷暴监守", color: "#89ddff", attackPattern: "spiral", bossShape: "storm", bossSkills: ["spiral", "summon"] },
    "nest-matriarch": { name: "覆巢母舰", color: "#ff6b84", attackPattern: "fan", bossShape: "nest", bossSkills: ["fan", "summon"] },
    "prism-oracle": { name: "棱镜先知", color: "#f0c5ff", attackPattern: "cross", bossShape: "prism", bossSkills: ["cross", "charge"] },
    "zero-archon": { name: "零度执政官", color: "#baf6ff", attackPattern: "ring", bossShape: "cryo", bossSkills: ["ring", "charge", "summon"] },
    "lattice-leviathan": { name: "晶格利维坦", color: "#d7a5ff", attackPattern: "radial", bossShape: "lattice", bossSkills: ["radial", "charge", "summon"] },
    "abyss-gardener": { name: "深渊园丁", color: "#c47cff", attackPattern: "lance", bossShape: "abyss", bossSkills: ["lance", "summon"] },
    "chorus-conductor": { name: "合唱指挥舰", color: "#fff0a8", attackPattern: "ring", bossShape: "chorus", bossSkills: ["ring", "summon"] },
    "cryo-hive-queen": { name: "寒潮蜂后", color: "#a5f6ec", attackPattern: "cross", bossShape: "hive", bossSkills: ["cross", "charge", "summon"] },
  };
  const variant = variants[variantId] ?? {};
  return {
    id: `boss-${variantId ?? level}`, name: variant.name ?? `Boss ${level}`, type: "boss", boss: true, variantId,
    hp: 170 + level * 34, speed: 0, radius: 48, score: 2600 + level * 240,
    color: variant.color ?? "#ff3c70", spawnWeight: 0, shootInterval: Math.max(0.7, 1.5 - level * 0.02), movement: "boss",
    bossShape: variant.bossShape ?? "default",
    summon: { interval: Math.max(2.8, 5.8 - level * 0.07), maxActive: 3 + Math.floor(level / 8), count: level >= 15 ? 2 : 1, pool: summonPool },
    attackPattern: variant.attackPattern ?? (level >= 40 ? "radial" : "fan"),
    bossSkills: variant.bossSkills ?? (level >= 45 ? ["radial", "charge", "summon"] : level >= 30 ? ["fan", "charge", "summon"] : ["fan", "summon"]),
    dashInterval: level >= 30 ? Math.max(3.4, 6.4 - level * 0.05) : 0,
    dashDuration: 0.5,
  };
}

export function getEnemyById(id) { return [...ENEMY_CONFIG, ...ADVANCED_ENEMY_CONFIG].find((enemy) => enemy.id === id) ?? null; }
