import { createLoadout } from "../config/module-config.js";
import { validateLoadout } from "./ModuleSystem.js";

export const HANGAR_SLOT_COUNT = 10;
export const LOCAL_SAVE_VERSION = 1;
export const LOCAL_SAVE_KEY = "neon-skies-local-save-v1";
export const DEFAULT_HANGAR_NAME = "未命名机体";

const createEmptyState = () => ({
  version: LOCAL_SAVE_VERSION,
  selectedHangarSlot: 0,
  hangarSlots: Array.from({ length: HANGAR_SLOT_COUNT }, () => null),
  beyondCode: null,
  updatedAt: 0,
});

function getStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function normalizeState(raw) {
  const state = createEmptyState();
  if (!raw || typeof raw !== "object") return state;
  state.selectedHangarSlot = Math.max(0, Math.min(HANGAR_SLOT_COUNT - 1, Number(raw.selectedHangarSlot) || 0));
  state.hangarSlots = Array.from({ length: HANGAR_SLOT_COUNT }, (_, index) => normalizeLoadoutSpec(raw.hangarSlots?.[index]));
  state.beyondCode = typeof raw.beyondCode === "string" && raw.beyondCode.trim() ? raw.beyondCode.trim() : null;
  state.updatedAt = Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0;
  return state;
}

function normalizeHangarName(name, fallback = DEFAULT_HANGAR_NAME) {
  const normalized = typeof name === "string" ? name.trim().slice(0, 24) : "";
  return normalized || fallback;
}

function normalizeLoadoutSpec(spec, fallbackName = DEFAULT_HANGAR_NAME) {
  if (!spec || typeof spec !== "object") return null;
  const modules = Array.isArray(spec.modules) ? spec.modules.map((entry, index) => ({
    instanceId: typeof entry?.instanceId === "string" ? entry.instanceId : `local-${index + 1}`,
    moduleId: entry?.moduleId,
    x: Number(entry?.x),
    y: Number(entry?.y),
    rotation: Number(entry?.rotation) || 0,
  })).filter((entry) => typeof entry.moduleId === "string" && Number.isFinite(entry.x) && Number.isFinite(entry.y)) : [];
  const synergies = Array.isArray(spec.synergies) ? spec.synergies.map((entry) => ({ id: entry?.id })).filter((entry) => typeof entry.id === "string") : [];
  return { name: normalizeHangarName(spec.name, fallbackName), modules, synergies };
}

export function serializeLoadout(loadout, name = DEFAULT_HANGAR_NAME) {
  return normalizeLoadoutSpec({
    name,
    modules: loadout?.modules ?? [],
    synergies: loadout?.synergies ?? [],
  });
}

export function restoreLoadout(spec) {
  const normalized = normalizeLoadoutSpec(spec);
  if (!normalized) return null;
  const loadout = createLoadout(normalized);
  return validateLoadout(loadout).valid ? loadout : null;
}

export class LocalSaveSystem {
  constructor(storage = undefined) {
    this.storage = getStorage(storage);
    this.state = this.read();
  }

  read() {
    if (!this.storage) return createEmptyState();
    try {
      return normalizeState(JSON.parse(this.storage.getItem(LOCAL_SAVE_KEY) ?? "null"));
    } catch {
      return createEmptyState();
    }
  }

  write() {
    this.state.updatedAt = Date.now();
    if (!this.storage) return false;
    try {
      this.storage.setItem(LOCAL_SAVE_KEY, JSON.stringify(this.state));
      return true;
    } catch {
      return false;
    }
  }

  getSelectedHangarSlot() { return this.state.selectedHangarSlot; }
  getHangarSlots() { return this.state.hangarSlots.map((spec) => restoreLoadout(spec)); }
  getHangarLoadout(slot) { return restoreLoadout(this.state.hangarSlots[slot]); }
  getHangarName(slot) { return normalizeHangarName(this.state.hangarSlots[slot]?.name, `机体 ${slot + 1}`); }

  saveHangarLoadout(slot, loadout, name = undefined) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= HANGAR_SLOT_COUNT) return false;
    this.state.selectedHangarSlot = slot;
    this.state.hangarSlots[slot] = serializeLoadout(loadout, name ?? this.getHangarName(slot));
    return this.write();
  }

  renameHangarSlot(slot, name) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= HANGAR_SLOT_COUNT || !this.state.hangarSlots[slot]) return false;
    this.state.hangarSlots[slot].name = normalizeHangarName(name, `机体 ${slot + 1}`);
    return this.write();
  }

  selectHangarSlot(slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= HANGAR_SLOT_COUNT) return false;
    this.state.selectedHangarSlot = slot;
    return this.write();
  }

  getBeyondCode() { return this.state.beyondCode; }
  saveBeyondCode(code) { this.state.beyondCode = typeof code === "string" && code.trim() ? code.trim() : null; return this.write(); }
  clearBeyondCode() { this.state.beyondCode = null; return this.write(); }
}
