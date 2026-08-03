import { ASSEMBLY_BOARD, CORE_MODULE, createLoadout, getFootprintCells, getInstalledEntries, getInstalledModules, getModuleById } from "../config/module-config.js";
import { GAME_CONFIG } from "../config/game-config.js";
import { normalizeSynergies, validateSynergies } from "../config/synergy-config.js";

export const MAX_SKILL_MODULES = 9;

function cloneModifiers(modifiers = {}) {
  return Object.fromEntries(Object.entries(modifiers).map(([key, value]) => [key, { add: value.add ?? 0, multiply: value.multiply ?? 1 }]));
}
export function calculateFinalStats(baseStats, modules) {
  const result = { ...baseStats };
  for (const module of modules.filter(Boolean)) for (const [key, modifier] of Object.entries(cloneModifiers(module.modifiers))) result[key] = ((result[key] ?? 0) + modifier.add) * modifier.multiply;
  result.attackSpeed = Math.min(GAME_CONFIG.player.maxAttackSpeed, Math.max(0, result.attackSpeed ?? GAME_CONFIG.player.attackSpeed));
  return result;
}
const isInside = (x, y) => x >= 0 && y >= 0 && x < ASSEMBLY_BOARD.columns && y < ASSEMBLY_BOARD.rows;
const key = (x, y) => `${x}:${y}`;
const entryCells = (entry) => getFootprintCells(entry.module, entry.x, entry.y);
export function countSkillModules(loadout) { return (loadout?.modules ?? []).filter((entry) => entry.module?.skill).length; }
// 连接判定只需检查当前模块周围的四个格子，不要为了每个格子拆解整个 Set。
// 这让大规模装配仍然保持近似 O(模块格数) 的校验成本。
function growsConnected(connected, cells) {
  return cells.some((cell) => connected.has(key(cell.x, cell.y))
    || connected.has(key(cell.x - 1, cell.y))
    || connected.has(key(cell.x + 1, cell.y))
    || connected.has(key(cell.x, cell.y - 1))
    || connected.has(key(cell.x, cell.y + 1)));
}

export function validateGeometry(loadout, { requireConnected = true } = {}) {
  const entries = getInstalledEntries(loadout); const cellsByEntry = entries.map(entryCells); const occupied = new Set();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]; const cells = cellsByEntry[index];
    if (!entry.module) return { valid: false, reason: "Invalid module" };
    if (entry.module !== CORE_MODULE && entry.module.connection !== "core") return { valid: false, reason: "Module must connect to core" };
    for (const cell of cells) {
      if (!isInside(cell.x, cell.y)) return { valid: false, reason: `Module outside ${ASSEMBLY_BOARD.columns}x${ASSEMBLY_BOARD.rows} board` };
      const cellKey = key(cell.x, cell.y); if (occupied.has(cellKey)) return { valid: false, reason: "Module overlap" }; occupied.add(cellKey);
    }
  }
  const connected = new Set(cellsByEntry[0].map((cell) => key(cell.x, cell.y))); let changed = true;
  while (changed) { changed = false; for (let index = 1; index < entries.length; index += 1) { const cells = cellsByEntry[index]; if (!cells.some((cell) => connected.has(key(cell.x, cell.y))) && growsConnected(connected, cells)) { cells.forEach((cell) => connected.add(key(cell.x, cell.y))); changed = true; } } }
  if (requireConnected && cellsByEntry.slice(1).some((cells) => !cells.some((cell) => connected.has(key(cell.x, cell.y))))) return { valid: false, reason: "Module is disconnected" };
  return { valid: true, reason: "ok" };
}

export function pruneDisconnected(loadout) {
  const entries = getInstalledEntries(loadout); const cellsByEntry = entries.map(entryCells); const connected = new Set(cellsByEntry[0].map((cell) => key(cell.x, cell.y))); const kept = []; let changed = true;
  while (changed) { changed = false; for (let index = 1; index < entries.length; index += 1) { const entry = entries[index]; if (kept.includes(entry)) continue; const cells = cellsByEntry[index]; if (!growsConnected(connected, cells)) continue; kept.push(entry); cells.forEach((cell) => connected.add(key(cell.x, cell.y))); changed = true; } }
  const keptIds = new Set(kept.map((entry) => entry.instanceId));
  const repaired = { ...loadout, modules: (loadout.modules ?? []).filter((entry) => keptIds.has(entry.instanceId)) };
  return { loadout: { ...repaired, synergies: normalizeSynergies(repaired) }, removed: (loadout.modules ?? []).filter((entry) => !keptIds.has(entry.instanceId)) };
}

export function validateLoadout(loadout) {
  if (!loadout?.core || loadout.core.id !== CORE_MODULE.id) return { valid: false, reason: "Core cannot be replaced" };
  if (!Array.isArray(loadout.modules)) return { valid: false, reason: "Invalid modules" };
  const synergyResult = validateSynergies(loadout); if (!synergyResult.valid) return synergyResult;
  if (countSkillModules(loadout) > MAX_SKILL_MODULES) return { valid: false, reason: `主动技能模块最多装配 ${MAX_SKILL_MODULES} 个` };
  const geometry = validateGeometry(loadout); if (!geometry.valid) return geometry;
  for (const { module } of loadout.modules) if (!module || !module.slotTypes?.includes(module.type)) return { valid: false, reason: "Invalid module type" };
  const moduleCounts = new Map();
  for (const { module } of loadout.modules) if (module) moduleCounts.set(module.id, (moduleCounts.get(module.id) ?? 0) + 1);
  for (const module of new Set(loadout.modules.map(({ module }) => module).filter(Boolean))) if (module.maxCount && (moduleCounts.get(module.id) ?? 0) > module.maxCount) return { valid: false, reason: `${module.id} max count exceeded` };
  return { valid: true, reason: "ok" };
}

export class ModuleSystem {
  install(spec = {}) { const loadout = createLoadout(spec); const result = validateLoadout(loadout); if (!result.valid) throw new Error(result.reason); return loadout; }
  calculateStats(baseStats, loadout) { const result = validateLoadout(loadout); if (!result.valid) throw new Error(result.reason); return calculateFinalStats(baseStats, getInstalledModules(loadout)); }
  getModule(id) { return getModuleById(id); }
}
