export const BEYOND_LIGHT_CONE_CONFIG = {
  maxPlayerHp: 50,
  layers: 13,
  lanes: 5,
  eliteRange: [2, 5],
  startingGold: 0,
  nodeTypes: {
    combat: { name: "普通战斗", icon: "✦", color: "#77dfff" },
    elite: { name: "精英战斗", icon: "✧", color: "#ffb35d" },
    shop: { name: "商店", icon: "$", color: "#9cf3b4" },
    rest: { name: "回复", icon: "+", color: "#8ee9ff" },
    event: { name: "事件", icon: "?", color: "#bd9cff" },
    boss: { name: "首领", icon: "✹", color: "#ff557e" },
  },
  // 采用原 1/4/7/10 档的强度曲线，压缩为四个清晰的选择档位。
  difficulties: [
    { level: 1, name: "休闲", hpMultiplier: 0.88, damageMultiplier: 0.84, spawnMultiplier: 0.92, rewardBonus: 0, chapters: 1, chapterHpStep: 0, chapterDamageStep: 0, chapterSpawnStep: 0, legacyLevel: 1 },
    { level: 2, name: "简单", hpMultiplier: 1.36, damageMultiplier: 1.2, spawnMultiplier: 1.1, rewardBonus: 1, chapters: 2, chapterHpStep: 0.16, chapterDamageStep: 0.1, chapterSpawnStep: 0.08, legacyLevel: 4 },
    { level: 3, name: "困难", hpMultiplier: 1.84, damageMultiplier: 1.56, spawnMultiplier: 1.28, rewardBonus: 2, chapters: 3, chapterHpStep: 0.2, chapterDamageStep: 0.14, chapterSpawnStep: 0.1, legacyLevel: 7 },
    { level: 4, name: "极限", hpMultiplier: 2.32, damageMultiplier: 1.92, spawnMultiplier: 1.46, rewardBonus: 3, chapters: 3, chapterHpStep: 0.34, chapterDamageStep: 0.24, chapterSpawnStep: 0.16, legacyLevel: 10 },
  ],
};

export const getBeyondDifficulty = (level = 1, { preferLegacy = false } = {}) => {
  const numericLevel = Number(level);
  const current = BEYOND_LIGHT_CONE_CONFIG.difficulties.find((item) => item.level === numericLevel);
  const legacy = BEYOND_LIGHT_CONE_CONFIG.difficulties.find((item) => item.legacyLevel === numericLevel);
  return (preferLegacy ? legacy ?? current : current ?? legacy) ?? BEYOND_LIGHT_CONE_CONFIG.difficulties[0];
};

export const getBeyondChapterCount = (difficulty = 1) => getBeyondDifficulty(difficulty).chapters ?? 1;
