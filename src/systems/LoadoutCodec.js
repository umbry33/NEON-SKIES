import { ASSEMBLY_BOARD, createLoadout, getModuleByShareCode } from "../config/module-config.js";
import { validateLoadout } from "./ModuleSystem.js";

// 配置码只保存稳定的数字编号、坐标和旋转信息。新增模块时分配新的
// shareCode 即可；已经发布过的编号绝不能修改或复用，旧配置码才能长期可用。
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
const PREFIX = "!1";
const ENTRY_WIDTH = 3;
const CHECKSUM_WIDTH = 2;
const ORIENTATIONS = 4;
const CELL_VARIANTS = ASSEMBLY_BOARD.columns * ASSEMBLY_BOARD.rows * ORIENTATIONS;
const MAX_SHARE_CODE = Math.floor(((ALPHABET.length ** ENTRY_WIDTH) - 1 - (CELL_VARIANTS - 1)) / CELL_VARIANTS);

const fail = (message) => { throw new Error(message); };

function encodeFixed(value, width) {
  if (!Number.isInteger(value) || value < 0) fail("配置码包含无效数据");
  let remaining = value;
  let encoded = "";
  for (let index = 0; index < width; index += 1) {
    encoded = ALPHABET[remaining % ALPHABET.length] + encoded;
    remaining = Math.floor(remaining / ALPHABET.length);
  }
  if (remaining > 0) fail("配置码数据超出当前格式范围");
  return encoded;
}

function decodeFixed(text) {
  let value = 0;
  for (const character of text) {
    const digit = ALPHABET.indexOf(character);
    if (digit < 0) fail("配置码包含不支持的字符");
    value = value * ALPHABET.length + digit;
  }
  return value;
}

function checksum(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
  return hash & 0xfff;
}

function packEntry(entry) {
  const shareCode = entry.module?.shareCode;
  const { x, y } = entry;
  const rotation = Number(entry.rotation ?? 0);
  if (!Number.isInteger(shareCode) || shareCode < 1 || shareCode > MAX_SHARE_CODE) fail("存在未配置分享编号的模块");
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= ASSEMBLY_BOARD.columns || y < 0 || y >= ASSEMBLY_BOARD.rows) fail("模块坐标超出核心网络");
  if (!Number.isInteger(rotation) || rotation < 0 || rotation >= ORIENTATIONS) fail("模块旋转数据无效");
  return encodeFixed((((shareCode * ASSEMBLY_BOARD.columns + x) * ASSEMBLY_BOARD.rows + y) * ORIENTATIONS) + rotation, ENTRY_WIDTH);
}

function unpackEntry(encoded, index) {
  let value = decodeFixed(encoded);
  const rotation = value % ORIENTATIONS;
  value = Math.floor(value / ORIENTATIONS);
  const y = value % ASSEMBLY_BOARD.rows;
  value = Math.floor(value / ASSEMBLY_BOARD.rows);
  const x = value % ASSEMBLY_BOARD.columns;
  const shareCode = Math.floor(value / ASSEMBLY_BOARD.columns);
  const module = getModuleByShareCode(shareCode);
  if (!module) fail("配置包含当前版本尚未支持的模块，无法完整还原");
  return { instanceId: `import-${index + 1}`, moduleId: module.id, x, y, rotation };
}

export function encodeLoadoutCode(loadout) {
  const validation = validateLoadout(loadout);
  if (!validation.valid) fail("当前机体结构无效，无法生成配置码");
  const payload = [...(loadout?.modules ?? [])]
    .sort((a, b) => a.y - b.y || a.x - b.x || (a.module?.shareCode ?? 0) - (b.module?.shareCode ?? 0) || (a.rotation ?? 0) - (b.rotation ?? 0))
    .map(packEntry)
    .join("");
  return `${PREFIX}${payload}${encodeFixed(checksum(`${PREFIX}${payload}`), CHECKSUM_WIDTH)}`;
}

export function decodeLoadoutCode(rawCode) {
  const code = String(rawCode ?? "").trim().replace(/\s+/g, "");
  if (!code.startsWith(PREFIX)) fail("不是可识别的机体配置码");
  if (code.length < PREFIX.length + CHECKSUM_WIDTH) fail("配置码不完整");
  const payload = code.slice(PREFIX.length, -CHECKSUM_WIDTH);
  if (payload.length % ENTRY_WIDTH !== 0) fail("配置码长度异常");
  const expectedChecksum = checksum(`${PREFIX}${payload}`);
  if (decodeFixed(code.slice(-CHECKSUM_WIDTH)) !== expectedChecksum) fail("配置码校验失败");
  const modules = Array.from({ length: payload.length / ENTRY_WIDTH }, (_, index) => unpackEntry(payload.slice(index * ENTRY_WIDTH, (index + 1) * ENTRY_WIDTH), index));
  const loadout = createLoadout({ modules });
  if (!validateLoadout(loadout).valid) fail("配置码中的机体结构无效");
  return { loadout, moduleCount: modules.length };
}
