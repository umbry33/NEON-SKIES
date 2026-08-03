// 连携能力只描述模块组合与效果；不依赖机体配置，避免形成循环引用。
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
    name: "水火相融？",
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

function validSelection(loadout, selection, claimed) {
  const synergy = getSynergyById(selection?.id);
  const instanceIds = Array.isArray(selection?.moduleInstanceIds) ? selection.moduleInstanceIds : [];
  if (!synergy || instanceIds.length !== synergy.requirements.length || new Set(instanceIds).size !== instanceIds.length) return false;
  if (instanceIds.some((instanceId) => claimed.has(instanceId))) return false;
  const entries = new Map((loadout?.modules ?? []).map((entry) => [entry.instanceId, entry]));
  const moduleIds = instanceIds.map((instanceId) => entries.get(instanceId)?.moduleId).sort();
  return moduleIds.length === synergy.requirements.length
    && moduleIds.every((moduleId, index) => moduleId === [...synergy.requirements].sort()[index]);
}

// 依次保留有效选择；同一个模块实例一旦被激活的连携占用，就不会参与后续连携。
export function normalizeSynergies(loadout, selections = loadout?.synergies ?? []) {
  const claimed = new Set();
  const normalized = [];
  for (const selection of selections) {
    if (!validSelection(loadout, selection, claimed)) continue;
    normalized.push({ id: selection.id, moduleInstanceIds: [...selection.moduleInstanceIds] });
    selection.moduleInstanceIds.forEach((instanceId) => claimed.add(instanceId));
  }
  return normalized;
}

export function validateSynergies(loadout) {
  const normalized = normalizeSynergies(loadout);
  const current = Array.isArray(loadout?.synergies) ? loadout.synergies : [];
  if (normalized.length !== current.length) return { valid: false, reason: "存在无效或冲突的连携能力" };
  return { valid: true, reason: "ok" };
}

export function hasActiveSynergy(loadout, synergyId) {
  return normalizeSynergies(loadout).some((selection) => selection.id === synergyId);
}

function findAvailableSelection(synergy, entries, claimed) {
  const chosen = []; const used = new Set();
  const choose = (index) => {
    if (index >= synergy.requirements.length) return true;
    const moduleId = synergy.requirements[index];
    for (const entry of entries) {
      if (entry.moduleId !== moduleId || claimed.has(entry.instanceId) || used.has(entry.instanceId)) continue;
      used.add(entry.instanceId); chosen.push(entry.instanceId);
      if (choose(index + 1)) return true;
      chosen.pop(); used.delete(entry.instanceId);
    }
    return false;
  };
  return choose(0) ? { id: synergy.id, moduleInstanceIds: chosen } : null;
}

export function getSynergyStates(loadout) {
  const active = normalizeSynergies(loadout);
  const claimed = new Set(active.flatMap((selection) => selection.moduleInstanceIds));
  const entries = loadout?.modules ?? [];
  return SYNERGY_CONFIG.map((synergy) => {
    const activeSelections = active.filter((selection) => selection.id === synergy.id);
    const availableSelection = findAvailableSelection(synergy, entries, claimed);
    return {
      ...synergy,
      activeSelections,
      availableSelection,
    };
  });
}
