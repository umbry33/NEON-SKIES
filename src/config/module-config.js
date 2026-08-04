const neutralModifiers = () => ({ maxHp: { add: 0, multiply: 1 }, moveSpeed: { add: 0, multiply: 1 }, attackSpeed: { add: 0, multiply: 1 } });
const footprint = (cells) => ({ cells: cells.map(([x, y]) => [x, y]) });
const oneCell = footprint([[0, 0]]);
const horizontal2 = footprint([[-1, 0], [0, 0]]);
const horizontal3 = footprint([[-1, 0], [0, 0], [1, 0]]);
const vertical2 = footprint([[0, -1], [0, 0]]);
const vertical3 = footprint([[0, -1], [0, 0], [0, 1]]);
const square2 = footprint([[-1, -1], [0, -1], [-1, 0], [0, 0]]);

export const ASSEMBLY_BOARD = { columns: 15, rows: 15, corePosition: { x: 7, y: 7 } };

const zh = {
  core: "\u6052\u661f\u6838\u5fc3",
  whirlwind: "\u95ea\u7535\u65cb\u98ce",
    nest: "\u8986\u5de2",
  ricochet: "\u5f39\u5c04\u5f39",
  ball: "\u7403\u72b6\u95ea\u7535",
  psionic: "\u8f89\u5149\u7075\u80fd",
  optical: "\u5149\u5b66\u8ff7\u8e2a",
  wingman: "\u50da\u673a\u53ec\u5524",
  chainsaw: "\u79bb\u5b50\u94fe\u952f",
  sonic: "\u9707\u98a4\u5f26\u4e50",
  zero: "\u96f6\u5ea6\u9886\u57df",
  aggregator: "\u80fd\u91cf\u805a\u5408\u5668",
  overclock: "\u8d85\u9891\u6a21\u5f0f",
  polarity: "\u6781\u6027\u53cd\u8f6c",
  blackHole: "\u9ed1\u6d1e\u6295\u5c04\u5668",
  flameCrossbow: "\u70c8\u7130\u5f29",
  waterShot: "\u6c34\u5f39",
};

export const CORE_MODULE = {
  id: "core-stellar", name: zh.core, type: "core", description: "Fixed core.", rarity: "legendary", icon: "*",
  connection: "root", footprint: oneCell, modifiers: neutralModifiers(), behavior: { type: "core" },
};

const weapon = (data) => ({ connection: "core", slotTypes: ["weapon"], footprint: oneCell, modifiers: neutralModifiers(), combat: true, ...data });
const special = (data) => ({ connection: "core", slotTypes: ["special"], footprint: oneCell, modifiers: neutralModifiers(), ...data });

export const MODULE_CONFIG = {
  weapons: [
    weapon({ id: "weapon-electric-whirlwind", shareCode: 1, name: zh.whirlwind, type: "weapon", description: "\u7ad6\u5411\u4e09\u683c\u3002\u81ea\u52a8\u7784\u51c6\u6700\u8fd1\u654c\u4eba\u7684\u65b9\u5411\uff0c\u89e6\u8fb9\u540e\u8fd4\u56de\u6a21\u5757\u3002", rarity: "legendary", icon: "Z", footprint: vertical3, behavior: { type: "electricWhirlwind", fireInterval: 0.1, damageInterval: 0.1, projectile: { damage: 3, speed: 520, radius: 76, life: 20, returnCaptureRadius: 14, returnTimeout: 3, emergencyReturnSpeed: 1800, rearmDelay: 0.6, color: "#a8f5ff" } } }),
    weapon({ id: "weapon-nest", shareCode: 2, name: zh.nest, type: "weapon", description: "\u6bcf 6 \u79d2\u5148\u5206\u6563\u53d1\u5c04 6 \u679a\u9ed1\u7ea2\u9707\u7206\u5bfc\u5f39\uff0c\u77ed\u6682\u540e\u5206\u6563\u7d22\u654c\u5e76\u9020\u6210\u5927\u8303\u56f4\u7206\u70b8\u3002", rarity: "epic", icon: "#", footprint: horizontal3, behavior: { type: "nest", fireInterval: 6, volley: 6, spreadAngle: 0.18, projectile: { damage: 5, speed: 580, homingDelay: 0.42, homingTurnRate: 8.5, radius: 18, life: 6, explosionRadius: 72, color: "#ef294d" } } }),
    weapon({ id: "weapon-ricochet", shareCode: 3, name: zh.ricochet, type: "weapon", description: "\u78b0\u5230\u8fb9\u7f18\u6216\u654c\u4eba\u540e\u53cd\u5f39\u3002", rarity: "rare", icon: "~", behavior: { type: "ricochet", fireInterval: 0.58, projectile: { damage: 2, speed: 360, radius: 5, life: 6, color: "#ffd36e" } } }),
    weapon({ id: "weapon-ball-lightning", shareCode: 4, name: zh.ball, type: "weapon", description: "\u6bcf 4 \u79d2\u53d1\u5c04\u4e00\u9897\u66f4\u5927\u3001\u5feb\u901f\u81a8\u80c0\u7684\u7403\u72b6\u95ea\u7535\u3002", rarity: "epic", icon: "o", behavior: { type: "ballLightning", fireInterval: 4, projectile: { damage: 3, damageEnd: 9, speed: 188.5, growthRate: 8.8, radius: 12, life: 4.5, color: "#b7a1ff" } } }),
    weapon({ id: "weapon-psionic", shareCode: 5, name: zh.psionic, type: "weapon", description: "\u53d1\u5c04\u7206\u70b8\u7075\u80fd\u7c92\u5b50\uff0c\u540c\u7c7b\u6a21\u5757\u8d8a\u591a\u653b\u901f\u8d8a\u5feb\u3002", rarity: "rare", icon: "@", behavior: { type: "psionic", stackKey: "psionic", stackedIntervals: [1.5, 1.3, 1], projectile: { damage: 6, speed: 310, radius: 10, life: 3, explosionRadius: 30, color: "#72f1c0" } } }),
    weapon({ id: "weapon-lightning-generator", shareCode: 11, name: "\u95ea\u7535\u751f\u6210\u5668", type: "weapon", description: "\u7ad6\u5411\u4e24\u683c\u3002\u6bcf 2 \u79d2\u5411\u524d\u65b9\u6700\u8fd1\u654c\u4eba\u91ca\u653e\u95ea\u7535\uff0c\u5728 200px \u8303\u56f4\u5185\u65e0\u9650\u8fde\u9501\u3002", rarity: "epic", icon: "L", footprint: vertical2, behavior: { type: "lightning", fireRate: 0.5, fireInterval: 2, projectile: { damage: 7, speed: 0, radius: 1, chainRadius: 200, chainLife: 0.25, flashDuration: 0.045, color: "#b86cff" } } }),
    weapon({ id: "weapon-black-hole", shareCode: 15, name: zh.blackHole, type: "weapon", description: "\u6bcf 7 \u79d2\u53d1\u5c04\u4e00\u679a\u7f13\u6162\u79fb\u52a8\u7684\u9ed1\u6d1e\uff0c\u6301\u7eed\u5438\u5f15\u654c\u4eba\u548c\u5f39\u5e55\u5e76\u9020\u6210\u4f24\u5bb3\uff0c\u7ed3\u675f\u65f6\u7206\u70b8\u3002", rarity: "legendary", icon: "B", footprint: square2, behavior: { type: "blackHole", fireInterval: 7, projectile: { damage: 2, speed: 66, radius: 16, life: 5.5, color: "#b57bff", blackHole: { pullRadius: 132, pullStrength: 105, damageInterval: 0.25, explosionRadius: 74, explosionDamage: 10 } } } }),
    weapon({ id: "special-energy-aggregator", shareCode: 12, name: zh.aggregator, type: "weapon", description: "\u81ea\u52a8\u653b\u51fb\u6a21\u5757\u3002\u5360 1 \u683c\uff0c\u6bcf\u4e2a\u4f7f\u6240\u6709\u81ea\u52a8\u653b\u51fb\u6a21\u5757\u653b\u901f\u63d0\u9ad8 20%\uff0c\u6700\u9ad8 300%\u3002\u4e0d\u5f71\u54cd\u4e3b\u52a8\u6280\u80fd\u51b7\u5374\u3002", rarity: "rare", icon: "A", modifiers: { maxHp: { add: 0, multiply: 1 }, moveSpeed: { add: 0, multiply: 1 }, attackSpeed: { add: 0.2, multiply: 1 } } }),
    weapon({ id: "weapon-flame-crossbow", shareCode: 16, name: zh.flameCrossbow, type: "weapon", description: "\u6bcf 1.5 \u79d2\u5411\u524d\u65b9\u6247\u5f62\u53d1\u5c04 3 \u652f\u70c8\u7130\u7bad\uff0c\u547d\u4e2d\u9020\u6210 5 \u70b9\u706b\u7130\u4f24\u5bb3\u5e76\u65bd\u52a0 3 \u79d2\u707c\u70e7\u3002\u707c\u70e7\u6bcf\u79d2\u53d1\u751f 3 \u6b21\uff0c\u6bcf\u6b21\u9020\u6210 1 \u70b9\u4f24\u5bb3\uff0c\u5171 9 \u6b21\uff0c\u91cd\u590d\u547d\u4e2d\u4f1a\u5237\u65b0\u6301\u7eed\u65f6\u95f4\u3002", rarity: "epic", icon: "F", element: "fire", behavior: { type: "flameCrossbow", fireInterval: 1.5, angles: [-0.12, 0, 0.12], projectile: { damage: 5, speed: 430, radius: 6, life: 3.2, color: "#ff3344", burn: { duration: 3, tickInterval: 1 / 3, damage: 1, ticks: 9 } } } }),
    weapon({ id: "weapon-water-shot", shareCode: 17, name: zh.waterShot, type: "weapon", description: "\u6bcf\u79d2\u53d1\u5c04 5 \u53d1\u6c34\u5f39\u3002\u6c34\u5f39\u547d\u4e2d\u540e\u6d88\u5931\u5e76\u4ea7\u751f\u5c0f\u8303\u56f4\u6c34\u82b1\u7206\u70b8\uff0c\u5bf9\u8303\u56f4\u5185\u5176\u4ed6\u654c\u4eba\u9020\u6210 2 \u70b9\u4f24\u5bb3\u3002", rarity: "epic", icon: "W", element: "water", behavior: { type: "waterShot", fireRate: 5, fireInterval: 0.2, projectile: { damage: 3, speed: 520, radius: 5, life: 2.6, explosionRadius: 28, explosionDamage: 2, color: "#176dff" } } }),
  ],
  specials: [
    special({ id: "special-optical", shareCode: 6, name: zh.optical, type: "special", description: "\u7ad6\u5411\u4e24\u683c\u3002\u4e3b\u52a8\u6280\u80fd：\u51b7\u5374 20 \u79d2\uff0c\u521b\u9020\u6301\u7eed 5 \u79d2\u3001\u4f24\u5bb3\u4e3a 30% \u7684\u5206\u8eab\u3002", rarity: "epic", icon: "O", footprint: vertical2, skill: { id: "decoy", name: "\u5149\u5b66\u5206\u8eab", cooldown: 20, duration: 5 } }),
    special({ id: "special-wingman", shareCode: 7, name: zh.wingman, type: "special", description: "\u6a2a\u5411\u4e09\u683c\u3002\u6700\u591a\u88c5\u5907\u4e00\u4e2a\uff0c\u81ea\u52a8\u53ec\u5524\u653b\u51fb\u50da\u673a\u3002", rarity: "epic", icon: "W", footprint: horizontal3, combat: true, maxCount: 1, behavior: { type: "wingman", fireInterval: 1 / 3, damage: 2 } }),
    special({ id: "special-chainsaw", shareCode: 8, name: zh.chainsaw, type: "special", description: "\u6a2a\u5411\u4e24\u683c\u3002\u6280\u80fd\u6301\u7eed 5 \u79d2\uff0c\u5728\u673a\u4f53\u4e24\u4fa7\u5c55\u5f00\u5bbd\u8303\u56f4\u79bb\u5b50\u94fe\u952f\uff0c\u4ee5\u9ad8\u9891\u6301\u7eed\u4f24\u5bb3\u538b\u5236\u8fd1\u8ddd\u79bb\u654c\u4eba\u3002", rarity: "epic", icon: "X", footprint: horizontal2, skill: { id: "ionSaw", name: "\u79bb\u5b50\u94fe\u952f", cooldown: 15, duration: 5 } }),
    special({ id: "special-sonic", shareCode: 9, name: zh.sonic, type: "special", description: "\u6a2a\u5411\u4e09\u683c\u3002\u7acb\u5373\u5728\u73a9\u5bb6\u9ad8\u5ea6\u521b\u5efa\u5f26\u4e50\uff0c\u6bcf 0.15 \u79d2\u5411\u4e0a\u521b\u5efa\u4e00\u6839\uff0c\u5149\u675f\u95f4\u8ddd\u66f4\u5927\uff0c\u6bcf\u6839\u53ea\u5224\u5b9a\u4e00\u6b21\u3002", rarity: "legendary", icon: "S", footprint: horizontal3, skill: { id: "sonicWave", name: "\u9707\u98a4\u5f26\u4e50", cooldown: 8, duration: 6.5 } }),
    special({ id: "special-zero", shareCode: 10, name: zh.zero, type: "special", description: "\u6a2a\u5411\u4e09\u683c\u3002\u51bb\u7ed3\u666e\u901a\u654c\u4eba\u548c\u654c\u65b9\u5f39\u5e55 3.5 \u79d2\u3002", rarity: "legendary", icon: "F", footprint: horizontal3, skill: { id: "freeze", name: "\u96f6\u5ea6\u9886\u57df", cooldown: 15, duration: 3.5 } }),
    special({ id: "special-overclock", shareCode: 13, name: zh.overclock, type: "special", description: "\u5360 2 \u00d7 2 \u683c\u3002\u4e3b\u52a8\u6280\u80fd\u6301\u7eed 5 \u79d2\uff0c\u6240\u6709\u81ea\u52a8\u6b66\u5668\u653b\u901f +80%\uff0c\u53ef\u7a81\u7834 300% \u4e0a\u9650\u4e00\u6b21\uff1b\u7ed3\u675f\u540e\u505c\u706b 1 \u79d2\u3002", rarity: "legendary", icon: "O", footprint: square2, skill: { id: "overclock", name: zh.overclock, cooldown: 15, duration: 5 } }),
    special({ id: "special-polarity-reverse", shareCode: 14, name: zh.polarity, type: "special", description: "\u5360 2 \u00d7 2 \u683c\u3002\u4e3b\u52a8\u6280\u80fd\u5c06\u5168\u90e8\u654c\u65b9\u5f39\u5e55\u505c\u6ede 0.25 \u79d2\u540e\u8f6c\u5316\u4e3a\u5df1\u65b9\u5f39\u5e55\uff0c\u5411\u4e0a\u5c04\u51fa\u5e76\u4f24\u5bb3\u654c\u4eba\u3002", rarity: "legendary", icon: "P", footprint: square2, skill: { id: "polarityReverse", name: zh.polarity, cooldown: 12, duration: 0.25 } }),
  ],
};

// 光锥之外的合成产物：常规模式默认可用，但航程内只能依配方获取。
// recipe 中的坐标是合成台 3×3 内的固定锚点；允许整体平移，不允许旋转或镜像。
const fusion = (data) => ({ ...data, beyondFusionOnly: true, fusionRecipe: data.fusionRecipe.map((item) => ({ ...item })) });
export const PLAYER_DISABLED_MODULE_IDS = new Set(["fusion-mirage-anchor", "fusion-overflow-drive", "fusion-photon-chorus"]);
export const FUSION_MODULES = [
  fusion(special({ id: "fusion-abyss-bloom", shareCode: 22, name: "深渊花冠", type: "special", description: "合成模块。2×2 格，展开四枚绕体旋转的深渊花瓣；花瓣会依次向外射出穿透花针，形成不断变换的四向火力。", rarity: "legendary", icon: "AB", footprint: square2, skill: { id: "abyssBloom", name: "深渊花冠", cooldown: 15, duration: 6.2 }, fusionRecipe: [{ moduleId: "weapon-ricochet", x: 0, y: 0 }, { moduleId: "weapon-psionic", x: 1, y: 0 }, { moduleId: "weapon-ball-lightning", x: 0, y: 1 }, { moduleId: "weapon-lightning-generator", x: 1, y: 1 }] })),
  fusion(special({ id: "fusion-photon-chorus", shareCode: 23, name: "光子合唱", type: "special", description: "合成模块。横向三格，放出六枚会自行分配目标的光子音符；命中后在目标周围奏出小范围爆裂。", rarity: "legendary", icon: "PC", footprint: horizontal3, skill: { id: "photonChoir", name: "光子合唱", cooldown: 12, duration: 0 }, fusionRecipe: [{ moduleId: "weapon-psionic", x: 0, y: 1 }, { moduleId: "weapon-ricochet", x: 1, y: 1 }, { moduleId: "special-energy-aggregator", x: 2, y: 1 }] })),
  fusion(special({ id: "fusion-cryo-hive", shareCode: 24, name: "冰凌", type: "special", description: "合成模块。横向三格，召唤三枚环绕模块的冰凌；冰凌弹命中敌人造成 2 点伤害，并使其全部行为减速 33%，持续 3 秒，重复命中只刷新持续时间。", rarity: "legendary", icon: "CH", footprint: horizontal3, skill: { id: "cryoHive", name: "冰凌", cooldown: 15, duration: 6.6 }, fusionRecipe: [{ moduleId: "weapon-water-shot", x: 0, y: 1 }, { moduleId: "weapon-ball-lightning", x: 1, y: 1 }, { moduleId: "weapon-flame-crossbow", x: 2, y: 1 }] })),
  special({ id: "fusion-mirage-anchor", shareCode: 28, name: "时空锚点", type: "special", description: "纵向两格。主动放置时空锚点，短暂航行后折返锚点，并清除锚点附近的敌方弹幕。", rarity: "epic", icon: "MA", footprint: vertical2, skill: { id: "mirageAnchor", name: "时空锚点", cooldown: 17, duration: 3.8 } }),
  fusion(special({ id: "fusion-polar-saw", shareCode: 29, name: "惊雷", type: "special", description: "合成模块。占 2×2 格，主动展开双极雷环，锁定远处目标并建立会跳切邻近敌机的雷链。", rarity: "epic", icon: "SR", footprint: square2, skill: { id: "polarTether", name: "惊雷", cooldown: 14, duration: 4.8 }, fusionRecipe: [{ moduleId: "weapon-lightning-generator", x: 0, y: 1 }, { moduleId: "weapon-lightning-generator", x: 1, y: 1 }] })),
  fusion(special({ id: "fusion-overflow-drive", shareCode: 30, name: "溢流驱动", type: "special", description: "合成模块。2×2 格，启动同步脉冲：立刻重置全部武器节奏，并在持续期间周期性齐射。", rarity: "epic", icon: "OD", footprint: square2, skill: { id: "overflowDrive", name: "溢流驱动", cooldown: 16, duration: 3.4 }, fusionRecipe: [{ moduleId: "weapon-ricochet", x: 0, y: 0 }, { moduleId: "weapon-water-shot", x: 1, y: 0 }, { moduleId: "weapon-flame-crossbow", x: 0, y: 1 }, { moduleId: "special-energy-aggregator", x: 1, y: 1 }] })),
];

// 现有传说模块同样可在光锥之外合成；稀有事件与指定首领可作为例外直接奖励它们。
export const LEGENDARY_FUSION_RECIPES = {
  "weapon-electric-whirlwind": [{ moduleId: "weapon-water-shot", x: 1, y: 0 }, { moduleId: "weapon-ball-lightning", x: 1, y: 1 }, { moduleId: "weapon-ricochet", x: 1, y: 2 }],
  "weapon-nest": [{ moduleId: "weapon-ricochet", x: 0, y: 1 }, { moduleId: "weapon-flame-crossbow", x: 1, y: 1 }, { moduleId: "weapon-water-shot", x: 2, y: 1 }],
  "special-optical": [{ moduleId: "weapon-psionic", x: 1, y: 0 }, { moduleId: "weapon-ricochet", x: 1, y: 1 }],
  "special-zero": [{ moduleId: "weapon-water-shot", x: 0, y: 1 }, { moduleId: "weapon-ball-lightning", x: 1, y: 1 }, { moduleId: "weapon-psionic", x: 2, y: 1 }],
};
MODULE_CONFIG.weapons.push(...FUSION_MODULES.filter((module) => module.type === "weapon"));
MODULE_CONFIG.specials.push(...FUSION_MODULES.filter((module) => module.type === "special"));

const abyssBloomModule = FUSION_MODULES.find((module) => module.id === "fusion-abyss-bloom");
if (abyssBloomModule) { abyssBloomModule.element = "dark"; abyssBloomModule.description = "合成模块。占 2 × 2 格，技能持续 6.2 秒；每次同时向四个方向发射穿透花针，形成持续变化的四向暗属性火力。"; }

// 惊雷是闪电生成器的自动强化形态，不再占用主动技能槽。
const polarSawModule = FUSION_MODULES.find((module) => module.id === "fusion-polar-saw");
if (polarSawModule) {
  delete polarSawModule.skill;
  Object.assign(polarSawModule, {
    type: "weapon",
    slotTypes: ["weapon"],
    combat: true,
    rarity: "legendary",
    description: "合成模块。占 2 × 2 格，闪电生成器的超级强化型自动模块；每 1.15 秒释放一道主雷击，并在更大范围内连续跳跃，形成多段雷暴链。",
    behavior: {
      type: "lightning",
      fireInterval: 0.7,
      projectile: { damage: 12, speed: 0, radius: 1, chainRadius: 300, chainLife: 0.36, flashDuration: 0.07, color: "#ffdf64" },
    },
  });
  MODULE_CONFIG.specials = MODULE_CONFIG.specials.filter((module) => module.id !== polarSawModule.id);
  if (!MODULE_CONFIG.weapons.includes(polarSawModule)) MODULE_CONFIG.weapons.push(polarSawModule);
}
MODULE_CONFIG.weapons = MODULE_CONFIG.weapons.filter((module) => !PLAYER_DISABLED_MODULE_IDS.has(module.id));
MODULE_CONFIG.specials = MODULE_CONFIG.specials.filter((module) => !PLAYER_DISABLED_MODULE_IDS.has(module.id));

const blackHoleModule = MODULE_CONFIG.weapons.find((module) => module.id === "weapon-black-hole");
const electricWhirlwindModule = MODULE_CONFIG.weapons.find((module) => module.id === "weapon-electric-whirlwind");
if (electricWhirlwindModule) electricWhirlwindModule.behavior.projectile.damage = 2;
const cryoHiveModule = FUSION_MODULES.find((module) => module.id === "fusion-cryo-hive");
if (cryoHiveModule?.skill) cryoHiveModule.skill.duration = 3.5;
const chainsawModule = MODULE_CONFIG.specials.find((module) => module.id === "special-chainsaw");
if (chainsawModule) chainsawModule.description = "横向两格。技能持续 5 秒，在机体两侧展开高频离子链锯；持续切割近距离敌机，并切除触碰范围内的敌方弹幕。";
if (cryoHiveModule) cryoHiveModule.description = "合成模块。横向三格，技能持续 3.5 秒；召唤三枚环绕模块旋转的冰凌，命中敌人造成 2 点冰属性伤害，并使其全部行为减速 33%，持续 3 秒，重复命中只刷新持续时间。";
if (polarSawModule) polarSawModule.description = "合成模块。占 2 × 2 格，是闪电生成器的超级强化型自动模块；每 0.7 秒释放一道主雷击，并在 300px 范围内连续跳跃，形成多段雷暴链。";
if (blackHoleModule) {
  blackHoleModule.description = "\u6bcf 7 \u79d2\u53d1\u5c04\u4e00\u679a\u7f13\u6162\u79fb\u52a8\u7684\u9ed1\u6d1e\uff0c\u6700\u591a\u5b58\u5728 5 \u79d2\u3002\u7b2c\u4e00\u6b21\u5438\u5230\u654c\u4eba\u540e 1 \u79d2\u7206\u70b8\uff0c\u5012\u8ba1\u65f6\u5185\u8303\u56f4\u6269\u5927 75\uff05\u3002";
  Object.assign(blackHoleModule.behavior.projectile, { damage: 0, speed: 165, radius: 8, life: 5 });
  Object.assign(blackHoleModule.behavior.projectile.blackHole, { pullRadius: 66, pullStrength: 210, slowSpeedMultiplier: 0.035, detonationDelay: 1, explosionRadius: 37 });
}
const overclockModule = MODULE_CONFIG.specials.find((module) => module.id === "special-overclock");
if (overclockModule) overclockModule.description = "\u5360 2 \u00d7 2 \u683c\u3002\u4e3b\u52a8\u6280\u80fd\u6301\u7eed 5 \u79d2\uff0c\u6240\u6709\u81ea\u52a8\u6b66\u5668\u653b\u901f +80%\uff0c\u53ef\u8d85\u8fc7 300% \u4e0a\u9650\u81f3 380%\u3002\u6301\u7eed\u671f\u95f4\u91cd\u590d\u4f7f\u7528\u53ea\u5237\u65b0 5 \u79d2\u65f6\u95f4\uff0c\u4e0d\u4f1a\u53e0\u52a0\u653b\u901f\uff1b\u7ed3\u675f\u540e\u505c\u706b 1 \u79d2\u3002";

const RARITY_OVERRIDES = {
  "weapon-electric-whirlwind": "legendary",
  "weapon-nest": "legendary",
  "weapon-lightning-generator": "epic",
  "special-optical": "legendary",
  "special-sonic": "epic",
  "special-zero": "legendary",
  "weapon-ball-lightning": "rare",
  "weapon-psionic": "rare",
  "special-wingman": "epic",
  "weapon-ricochet": "rare",
  "special-chainsaw": "rare",
  "special-energy-aggregator": "rare",
  "special-overclock": "epic",
  "special-polarity-reverse": "epic",
  "weapon-black-hole": "epic",
  "weapon-flame-crossbow": "epic",
  "weapon-water-shot": "epic",
};
for (const module of [...MODULE_CONFIG.weapons, ...MODULE_CONFIG.specials]) if (RARITY_OVERRIDES[module.id]) module.rarity = RARITY_OVERRIDES[module.id];
for (const [id, recipe] of Object.entries(LEGENDARY_FUSION_RECIPES)) {
  const module = [...MODULE_CONFIG.weapons, ...MODULE_CONFIG.specials].find((item) => item.id === id);
  if (module) Object.assign(module, { beyondFusionOnly: true, fusionRecipe: recipe.map((item) => ({ ...item })) });
}

export const ALL_MODULES = [CORE_MODULE, ...MODULE_CONFIG.weapons, ...MODULE_CONFIG.specials, ...FUSION_MODULES.filter((module) => PLAYER_DISABLED_MODULE_IDS.has(module.id))];
export function getModuleById(id) { return ALL_MODULES.find((module) => module.id === id) ?? null; }
export function getModuleByShareCode(shareCode) { return ALL_MODULES.find((module) => module.shareCode === shareCode) ?? null; }
export const MODULE_ELEMENT_CONFIG = {
  "weapon-ricochet": "neutral", "special-energy-aggregator": "neutral", "special-chainsaw": "neutral", "special-wingman": "neutral", "special-overclock": "neutral",
  "weapon-ball-lightning": "electric", "weapon-lightning-generator": "electric", "special-sonic": "electric", "special-polarity-reverse": "electric", "weapon-electric-whirlwind": "electric",
  "weapon-psionic": "light", "special-optical": "light", "weapon-black-hole": "dark", "weapon-nest": "dark", "special-zero": "ice", "weapon-water-shot": "water", "weapon-flame-crossbow": "fire",
  "fusion-abyss-bloom": "dark", "fusion-photon-chorus": "light", "fusion-cryo-hive": "ice", "fusion-mirage-anchor": "light", "fusion-polar-saw": "electric", "fusion-overflow-drive": "neutral",
};
export function getModuleElement(moduleOrId) { const id = typeof moduleOrId === "string" ? moduleOrId : moduleOrId?.id; return moduleOrId?.element ?? MODULE_ELEMENT_CONFIG[id] ?? "neutral"; }
export function getFootprintCells(module, anchorX, anchorY) { return (module?.footprint?.cells ?? [[0, 0]]).map(([x, y]) => ({ x: anchorX + x, y: anchorY + y })); }
export function getFootprintBounds(module) {
  const cells = module?.footprint?.cells ?? [[0, 0]]; const xs = cells.map(([x]) => x); const ys = cells.map(([, y]) => y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
function resolveModule(value) { return !value ? null : getModuleById(typeof value === "string" ? value : value.moduleId ?? value.id); }
const defaultBuild = [];
export function createLoadout(spec = {}) {
  const rawModules = Array.isArray(spec.modules) ? spec.modules : defaultBuild;
  const modules = rawModules.map((entry, index) => { const module = resolveModule(entry); if (!module) return null; return { instanceId: entry.instanceId ?? `module-${index}-${module.id}`, moduleId: module.id, module, x: Number(entry.x ?? ASSEMBLY_BOARD.corePosition.x), y: Number(entry.y ?? ASSEMBLY_BOARD.corePosition.y - 1), rotation: Number(entry.rotation ?? 0) }; }).filter(Boolean);
  const loadout = { core: CORE_MODULE, corePosition: { ...ASSEMBLY_BOARD.corePosition }, modules };
  return { ...loadout, synergies: normalizeSynergies(loadout, spec.synergies) };
}
export function getInstalledEntries(loadout) { return [{ slotId: "core", instanceId: "core", module: CORE_MODULE, x: ASSEMBLY_BOARD.corePosition.x, y: ASSEMBLY_BOARD.corePosition.y, rotation: 0 }, ...(loadout?.modules ?? []).map((entry) => ({ slotId: entry.instanceId, instanceId: entry.instanceId, module: entry.module ?? getModuleById(entry.moduleId), x: entry.x, y: entry.y, rotation: entry.rotation ?? 0 }))]; }
export function getInstalledModules(loadout) { return getInstalledEntries(loadout).map(({ module }) => module).filter(Boolean); }
import { normalizeSynergies } from "./synergy-config.js";
