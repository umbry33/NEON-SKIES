// 连携能力只描述模块组合与效果；装配后会自动作用于所有满足条件的模块实例。
export const SYNERGY_CONFIG = [
  {
    id: "synergy-wolfpack",
    name: "狼群",
    type: "automatic",
    rarity: "legendary",
    icon: "W",
    description: "僚机获得覆巢导弹发射能力，基础子弹保持不变，并切换为黑红涂装。",
    requirements: ["special-wingman", "weapon-nest"],
    behavior: { type: "wingmanNest" },
  },
  {
    id: "synergy-white-hole",
    name: "白洞",
    type: "passive",
    rarity: "legendary",
    icon: "W",
    description: "极性反转会接管黑洞吸引的弹幕。弹幕追踪玩家，命中敌人后继续飞行，最终命中玩家并转化为治疗。",
    requirements: ["weapon-black-hole", "special-polarity-reverse"],
    behavior: { type: "whiteHole" },
  },
  {
    id: "synergy-water-fire",
    name: "水火相融",
    type: "automatic",
    rarity: "epic",
    icon: "W/F",
    description: "火焰弩有 25% 概率改发三颗散射水弹；水弹有 75% 概率改发火弹，并附带完整灼烧效果。",
    requirements: ["weapon-water-shot", "weapon-flame-crossbow"],
    behavior: { type: "waterFire" },
  },
];

export function getSynergyById(id) {
  return SYNERGY_CONFIG.find((synergy) => synergy.id === id) ?? null;
}

function requirementsMet(loadout, synergy) {
  const available = new Map();
  for (const entry of loadout?.modules ?? []) available.set(entry.moduleId, (available.get(entry.moduleId) ?? 0) + 1);
  for (const requirement of synergy.requirements) {
    const count = available.get(requirement) ?? 0;
    if (count <= 0) return false;
    available.set(requirement, count - 1);
  }
  return true;
}

// 兼容旧存档中的 moduleInstanceIds，但不再用它们决定增益范围或占用模块。
export function normalizeSynergies(loadout, selections = loadout?.synergies ?? []) {
  const normalized = [];
  const seen = new Set();
  for (const selection of selections) {
    const synergy = getSynergyById(selection?.id);
    if (!synergy || seen.has(synergy.id) || !requirementsMet(loadout, synergy)) continue;
    normalized.push({ id: synergy.id });
    seen.add(synergy.id);
  }
  return normalized;
}

export function validateSynergies(loadout) {
  const normalized = normalizeSynergies(loadout);
  const current = Array.isArray(loadout?.synergies) ? loadout.synergies : [];
  const currentIds = current.map((selection) => selection?.id);
  if (normalized.length !== current.length || new Set(currentIds).size !== currentIds.length || normalized.some((selection, index) => selection.id !== currentIds[index])) {
    return { valid: false, reason: "存在无效或重复的连携能力" };
  }
  return { valid: true, reason: "ok" };
}

export function hasActiveSynergy(loadout, synergyId) {
  return normalizeSynergies(loadout).some((selection) => selection.id === synergyId);
}

export function getSynergyStates(loadout) {
  const active = normalizeSynergies(loadout);
  return SYNERGY_CONFIG.map((synergy) => {
    const activeSelections = active.filter((selection) => selection.id === synergy.id);
    return {
      ...synergy,
      activeSelections,
      availableSelection: activeSelections.length || !requirementsMet(loadout, synergy) ? null : { id: synergy.id },
    };
  });
}
