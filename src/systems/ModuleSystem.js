import { ASSEMBLY_BOARD, CORE_MODULE, createLoadout, getFootprintCells, getInstalledEntries, getInstalledModules, getModuleById } from "../config/module-config.js";
import { GAME_CONFIG } from "../config/game-config.js";

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
const isAdjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const key = (x, y) => `${x}:${y}`;
const entryCells = (entry) => getFootprintCells(entry.module, entry.x, entry.y);
export function countSkillModules(loadout) { return (loadout?.modules ?? []).filter((entry) => entry.module?.skill).length; }
function growsConnected(connected, cells) { return cells.some((cell) => [...connected].some((item) => { const [x, y] = item.split(":").map(Number); return connected.has(key(cell.x, cell.y)) || isAdjacent(cell, { x, y }); })); }

export function validateGeometry(loadout, { requireConnected = true } = {}) {
  const entries = getInstalledEntries(loadout); const occupied = new Set();
  for (const entry of entries) {
    if (!entry.module) return { valid: false, reason: "Invalid module" };
    if (entry.module !== CORE_MODULE && entry.module.connection !== "core") return { valid: false, reason: "Module must connect to core" };
    for (const cell of entryCells(entry)) {
      if (!isInside(cell.x, cell.y)) return { valid: false, reason: "Module outside 9x9 board" };
      const cellKey = key(cell.x, cell.y); if (occupied.has(cellKey)) return { valid: false, reason: "Module overlap" }; occupied.add(cellKey);
    }
  }
  const connected = new Set(entryCells(entries[0]).map((cell) => key(cell.x, cell.y))); let changed = true;
  while (changed) { changed = false; for (const entry of entries.slice(1)) { const cells = entryCells(entry); if (!cells.some((cell) => connected.has(key(cell.x, cell.y))) && growsConnected(connected, cells)) { cells.forEach((cell) => connected.add(key(cell.x, cell.y))); changed = true; } } }
  if (requireConnected && entries.slice(1).some((entry) => !entryCells(entry).some((cell) => connected.has(key(cell.x, cell.y))))) return { valid: false, reason: "Module is disconnected" };
  return { valid: true, reason: "ok" };
}

export function pruneDisconnected(loadout) {
  const entries = getInstalledEntries(loadout); const connected = new Set(entryCells(entries[0]).map((cell) => key(cell.x, cell.y))); const kept = []; let changed = true;
  while (changed) { changed = false; for (const entry of entries.slice(1)) { if (kept.includes(entry)) continue; const cells = entryCells(entry); if (!growsConnected(connected, cells)) continue; kept.push(entry); cells.forEach((cell) => connected.add(key(cell.x, cell.y))); changed = true; } }
  const keptIds = new Set(kept.map((entry) => entry.instanceId));
  return { loadout: { ...loadout, modules: (loadout.modules ?? []).filter((entry) => keptIds.has(entry.instanceId)) }, removed: (loadout.modules ?? []).filter((entry) => !keptIds.has(entry.instanceId)) };
}

export function validateLoadout(loadout) {
  if (!loadout?.core || loadout.core.id !== CORE_MODULE.id) return { valid: false, reason: "Core cannot be replaced" };
  if (!Array.isArray(loadout.modules) || loadout.modules.length > ASSEMBLY_BOARD.maxModules) return { valid: false, reason: "Too many modules" };
  if (countSkillModules(loadout) > MAX_SKILL_MODULES) return { valid: false, reason: `主动技能模块最多装配 ${MAX_SKILL_MODULES} 个` };
  const geometry = validateGeometry(loadout); if (!geometry.valid) return geometry;
  for (const { module } of loadout.modules) if (!module || !module.slotTypes?.includes(module.type)) return { valid: false, reason: "Invalid module type" };
  for (const module of new Set(loadout.modules.map(({ module }) => module))) { const count = loadout.modules.filter(({ module: current }) => current?.id === module.id).length; if (module.maxCount && count > module.maxCount) return { valid: false, reason: `${module.id} max count exceeded` }; }
  return { valid: true, reason: "ok" };
}

export class ModuleSystem {
  install(spec = {}) { const loadout = createLoadout(spec); const result = validateLoadout(loadout); if (!result.valid) throw new Error(result.reason); return loadout; }
  calculateStats(baseStats, loadout) { const result = validateLoadout(loadout); if (!result.valid) throw new Error(result.reason); return calculateFinalStats(baseStats, getInstalledModules(loadout)); }
  getModule(id) { return getModuleById(id); }
}
