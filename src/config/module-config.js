const neutralModifiers = () => ({ maxHp: { add: 0, multiply: 1 }, moveSpeed: { add: 0, multiply: 1 }, attackSpeed: { add: 0, multiply: 1 } });
const footprint = (cells) => ({ cells: cells.map(([x, y]) => [x, y]) });
const oneCell = footprint([[0, 0]]);
const horizontal2 = footprint([[-1, 0], [0, 0]]);
const horizontal3 = footprint([[-1, 0], [0, 0], [1, 0]]);
const vertical2 = footprint([[0, -1], [0, 0]]);
const vertical3 = footprint([[0, -1], [0, 0], [0, 1]]);

export const ASSEMBLY_BOARD = { columns: 9, rows: 9, corePosition: { x: 4, y: 4 }, maxModules: 60 };

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
  ],
  specials: [
    special({ id: "special-optical", shareCode: 6, name: zh.optical, type: "special", description: "\u7ad6\u5411\u4e24\u683c\u3002\u4e3b\u52a8\u6280\u80fd：\u51b7\u5374 20 \u79d2\uff0c\u521b\u9020\u6301\u7eed 5 \u79d2\u3001\u4f24\u5bb3\u4e3a 30% \u7684\u5206\u8eab\u3002", rarity: "epic", icon: "O", footprint: vertical2, skill: { id: "decoy", name: "\u5149\u5b66\u5206\u8eab", cooldown: 20, duration: 5 } }),
    special({ id: "special-wingman", shareCode: 7, name: zh.wingman, type: "special", description: "\u6a2a\u5411\u4e09\u683c\u3002\u6700\u591a\u88c5\u5907\u4e00\u4e2a\uff0c\u81ea\u52a8\u53ec\u5524\u653b\u51fb\u50da\u673a\u3002", rarity: "epic", icon: "W", footprint: horizontal3, combat: true, maxCount: 1, behavior: { type: "wingman", fireInterval: 1 / 3, damage: 2 } }),
    special({ id: "special-chainsaw", shareCode: 8, name: zh.chainsaw, type: "special", description: "\u6a2a\u5411\u4e24\u683c\u3002\u6280\u80fd\u6301\u7eed 5 \u79d2\uff0c\u5bf9\u4e24\u4fa7\u8fd1\u8ddd\u79bb\u654c\u4eba\u8fdb\u884c\u9ad8\u9891\u5207\u5272\u3002", rarity: "epic", icon: "X", footprint: horizontal2, skill: { id: "ionSaw", name: "\u79bb\u5b50\u94fe\u952f", cooldown: 15, duration: 5 } }),
    special({ id: "special-sonic", shareCode: 9, name: zh.sonic, type: "special", description: "\u6a2a\u5411\u4e09\u683c\u3002\u7acb\u5373\u5728\u73a9\u5bb6\u9ad8\u5ea6\u521b\u5efa\u5f26\u4e50\uff0c\u6bcf 0.15 \u79d2\u5411\u4e0a\u521b\u5efa\u4e00\u6839\uff0c\u5149\u675f\u95f4\u8ddd\u66f4\u5927\uff0c\u6bcf\u6839\u53ea\u5224\u5b9a\u4e00\u6b21\u3002", rarity: "legendary", icon: "S", footprint: horizontal3, skill: { id: "sonicWave", name: "\u9707\u98a4\u5f26\u4e50", cooldown: 8, duration: 6.5 } }),
    special({ id: "special-zero", shareCode: 10, name: zh.zero, type: "special", description: "\u6a2a\u5411\u4e09\u683c\u3002\u51bb\u7ed3\u666e\u901a\u654c\u4eba\u548c\u654c\u65b9\u5f39\u5e55 3.5 \u79d2\u3002", rarity: "legendary", icon: "F", footprint: horizontal3, skill: { id: "freeze", name: "\u96f6\u5ea6\u9886\u57df", cooldown: 15, duration: 3.5 } }),
    special({ id: "special-energy-aggregator", shareCode: 12, name: zh.aggregator, type: "special", description: "\u5360 1 \u683c\u3002\u6bcf\u4e2a\u4f7f\u6240\u6709\u81ea\u52a8\u653b\u51fb\u6a21\u5757\u653b\u901f\u63d0\u9ad8 20%\uff0c\u6700\u9ad8 300%\u3002\u4e0d\u5f71\u54cd\u4e3b\u52a8\u6280\u80fd\u51b7\u5374\u3002", rarity: "rare", icon: "A", modifiers: { maxHp: { add: 0, multiply: 1 }, moveSpeed: { add: 0, multiply: 1 }, attackSpeed: { add: 0.2, multiply: 1 } } }),
  ],
};

const RARITY_OVERRIDES = {
  "weapon-electric-whirlwind": "legendary",
  "weapon-nest": "legendary",
  "weapon-lightning-generator": "legendary",
  "special-optical": "legendary",
  "special-sonic": "legendary",
  "special-zero": "legendary",
  "weapon-ball-lightning": "epic",
  "weapon-psionic": "epic",
  "special-wingman": "epic",
  "weapon-ricochet": "rare",
  "special-chainsaw": "rare",
  "special-energy-aggregator": "rare",
};
for (const module of [...MODULE_CONFIG.weapons, ...MODULE_CONFIG.specials]) if (RARITY_OVERRIDES[module.id]) module.rarity = RARITY_OVERRIDES[module.id];

export const ALL_MODULES = [CORE_MODULE, ...MODULE_CONFIG.weapons, ...MODULE_CONFIG.specials];
export function getModuleById(id) { return ALL_MODULES.find((module) => module.id === id) ?? null; }
export function getModuleByShareCode(shareCode) { return ALL_MODULES.find((module) => module.shareCode === shareCode) ?? null; }
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
  const modules = rawModules.map((entry, index) => { const module = resolveModule(entry); if (!module) return null; return { instanceId: entry.instanceId ?? `module-${index}-${module.id}`, moduleId: module.id, module, x: Number(entry.x ?? 4), y: Number(entry.y ?? 3), rotation: Number(entry.rotation ?? 0) }; }).filter(Boolean);
  return { core: CORE_MODULE, corePosition: { ...ASSEMBLY_BOARD.corePosition }, modules };
}
export function getInstalledEntries(loadout) { return [{ slotId: "core", instanceId: "core", module: CORE_MODULE, x: 4, y: 4, rotation: 0 }, ...(loadout?.modules ?? []).map((entry) => ({ slotId: entry.instanceId, instanceId: entry.instanceId, module: entry.module ?? getModuleById(entry.moduleId), x: entry.x, y: entry.y, rotation: entry.rotation ?? 0 }))]; }
export function getInstalledModules(loadout) { return getInstalledEntries(loadout).map(({ module }) => module).filter(Boolean); }
