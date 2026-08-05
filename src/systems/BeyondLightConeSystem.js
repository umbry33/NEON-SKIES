import { BEYOND_LIGHT_CONE_CONFIG, getBeyondChapterCount, getBeyondDifficulty } from "../config/beyond-light-cone-config.js";
import { getBeyondEnvironmentPool } from "../config/environment-config.js";
import { ENEMY_CONFIG, ADVANCED_ENEMY_CONFIG, ENABLED_PROTOTYPE_ENEMY_CONFIG } from "../config/enemy-config.js";
import { ALL_MODULES, FUSION_MODULES, PLAYER_DISABLED_MODULE_IDS, createLoadout, getInstalledEntries, getModuleById } from "../config/module-config.js";
import { BEYOND_EVENTS, getBeyondEventById } from "../config/beyond-events-config.js";

const allModules = ALL_MODULES.filter((module) => module.type !== "core");
const fusionModuleIds = new Set(FUSION_MODULES.map((module) => module.id));
const FIRST_CHAPTER_OPENING_EVENT_IDS = ["orphan-wingman", "zero-maintenance", "gravity-post"];
const BOSS_VARIANTS = [
  { id: "storm-warden", name: "雷暴监守", rewardId: "weapon-electric-whirlwind", color: "#89ddff" },
  { id: "nest-matriarch", name: "覆巢母舰", rewardId: "weapon-nest", color: "#ff6b84" },
  { id: "prism-oracle", name: "棱镜先知", rewardId: "special-optical", color: "#f0c5ff" },
  { id: "zero-archon", name: "零度执政官", rewardId: "special-zero", color: "#baf6ff" },
  { id: "abyss-gardener", name: "深渊园丁", rewardId: "fusion-abyss-bloom", color: "#c47cff" },
  { id: "chorus-conductor", name: "合唱指挥舰", rewardId: "fusion-photon-chorus", color: "#fff0a8" },
  { id: "cryo-hive-queen", name: "寒潮蜂后", rewardId: "fusion-cryo-hive", color: "#a5f6ec" },
];
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const CODE_KEY = [39, 113, 201, 86, 157, 18, 245, 92, 67, 180, 23, 141];
const moduleCode = (id) => allModules.findIndex((module) => module.id === id);
const moduleIdFromCode = (code) => allModules[Number(code)]?.id ?? null;

function hashSeed(value) {
  let hash = 2166136261;
  for (const char of String(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
function rngFrom(seed) {
  let state = hashSeed(seed) || 1;
  return () => { state |= 0; state = state + 0x6d2b79f5 | 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function choose(rng, list) { return list[Math.floor(rng() * list.length)]; }
function shuffled(rng, list) { return [...list].sort(() => rng() - .5); }
function makeSeed() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; }

function pickNodeType({ layer, layers, rng, elites, previousTypes }) {
  if (layer === 0) return "combat";
  if (layer === layers - 2) return "rest";
  if (layer === layers - 1) return "boss";
  if (layer < 5) return choose(rng, ["combat", "combat", "event", "shop"]);
  const canElite = elites.current < elites.target;
  const pool = ["combat", "combat", "event", "shop", "rest", ...(canElite ? ["elite"] : [])];
  const filtered = previousTypes.length >= 2 && previousTypes.at(-1) === previousTypes.at(-2)
    ? pool.filter((type) => type !== previousTypes.at(-1)) : pool;
  const type = choose(rng, filtered.length ? filtered : pool);
  if (type === "elite") elites.current += 1;
  return type;
}

export class BeyondLightConeSystem {
  createRun(difficulty = 1, seed = makeSeed()) {
    const selectedDifficulty = getBeyondDifficulty(difficulty);
    const chapter = 1;
    const chapterSeed = `${seed}:chapter:${chapter}`;
    const map = this.generateMap(chapterSeed, chapter);
    return {
      version: 4,
      seed,
      difficulty: selectedDifficulty.level,
      chapter,
      totalChapters: getBeyondChapterCount(selectedDifficulty.level),
      chapterSeed,
      map,
      currentNodeId: null,
      visited: [],
      gold: BEYOND_LIGHT_CONE_CONFIG.startingGold,
      hp: Math.round(BEYOND_LIGHT_CONE_CONFIG.maxPlayerHp),
      inventory: {},
      loadout: createLoadout(),
      stats: { nodes: { combat: 0, elite: 0, boss: 0, shop: 0, rest: 0, event: 0 }, routeLength: 0, battles: 0, totalElapsed: 0, modulesGained: 0, goldGained: 0, goldSpent: 0, healing: 0 },
      eventState: { combatStreak: 0, peacefulStreak: 0 },
      eventHistory: [],
      activeEvent: null,
      log: ["航程已启动"],
      completed: false,
    };
  }

  generateMap(seed, chapter = 1) {
    const rng = rngFrom(seed); const { layers, lanes, eliteRange } = BEYOND_LIGHT_CONE_CONFIG;
    const openingEvents = chapter === 1;
    const eliteTarget = eliteRange[0] + Math.floor(rng() * (eliteRange[1] - eliteRange[0] + 1));
    const eliteState = { target: eliteTarget, current: 0 };
    const result = []; let previousTypes = [];
    for (let layer = 0; layer < layers; layer += 1) {
      const count = openingEvents && layer < 3 ? 1 : layer === 0 || layer >= layers - 2 ? 1 : 2 + Math.floor(rng() * 2);
      const usedLanes = shuffled(rng, Array.from({ length: lanes }, (_, i) => i)).slice(0, count).sort((a, b) => a - b);
      const types = usedLanes.map((lane, index) => openingEvents && layer < 3 ? "event" : pickNodeType({ layer, layers, rng, elites: eliteState, previousTypes })).map((type, index) => ({
        id: `${layer}-${usedLanes[index]}-${Math.floor(rng() * 9999).toString(36)}`,
        layer, lane: usedLanes[index], type, edges: [], cleared: false,
        ...(openingEvents && layer < 3 ? { eventId: FIRST_CHAPTER_OPENING_EVENT_IDS[layer] } : {}),
      }));
      if (layer === layers - 2) types[0].type = "rest";
      if (layer === layers - 1) {
        types[0].type = "boss";
        const variant = choose(rng, BOSS_VARIANTS);
        Object.assign(types[0], { bossVariant: variant.id, bossName: variant.name, bossRewardId: variant.rewardId });
      }
      result.push(types); previousTypes = types.map((node) => node.type);
    }
    // Random weighting may miss elites entirely. Fill the configured minimum
    // after generation so every expedition still presents meaningful risk/reward choices.
    if (eliteState.current < eliteState.target) {
      const candidates = shuffled(rng, result.slice(5, -2).flat().filter((node) => node.type !== "elite"));
      for (const node of candidates) {
        if (eliteState.current >= eliteState.target) break;
        node.type = "elite"; eliteState.current += 1;
      }
    }
    // Every node has a forward link. Every node except the first also receives one.
    for (let layer = 0; layer < result.length - 1; layer += 1) {
      const current = result[layer]; const next = result[layer + 1];
      current.forEach((node) => {
        const nearest = [...next].sort((a, b) => Math.abs(a.lane - node.lane) - Math.abs(b.lane - node.lane));
        node.edges.push(nearest[0].id);
        if (nearest[1] && rng() > .42) node.edges.push(nearest[1].id);
      });
      next.forEach((node) => {
        if (!current.some((origin) => origin.edges.includes(node.id))) {
          const origin = [...current].sort((a, b) => Math.abs(a.lane - node.lane) - Math.abs(b.lane - node.lane))[0];
          origin.edges.push(node.id);
        }
      });
    }
    return result;
  }

  findNode(run, id) { return run?.map.flat().find((node) => node.id === id) ?? null; }
  getAvailableNodes(run) {
    if (!run?.currentNodeId) return run?.map?.[0] ?? [];
    const current = this.findNode(run, run.currentNodeId);
    return (run?.map?.[current?.layer + 1] ?? []).filter((node) => current?.edges.includes(node.id));
  }
  advanceChapter(run) {
    if (!run || (run.chapter ?? 1) >= (run.totalChapters ?? 1)) return false;
    run.chapter = (run.chapter ?? 1) + 1;
    run.chapterSeed = `${run.seed}:chapter:${run.chapter}`;
    run.map = this.generateMap(run.chapterSeed, run.chapter);
    run.currentNodeId = null;
    run.visited = [];
    run.activeEvent = null;
    run.currentBattle = null;
    run.eventState = { combatStreak: 0, peacefulStreak: 0 };
    run.log ??= [];
    run.log.push(`进入第 ${run.chapter} / ${run.totalChapters} 章`);
    return true;
  }
  canEnterNode(run, id) { return this.getAvailableNodes(run).some((node) => node.id === id); }
  enterNode(run, id) {
    if (!this.canEnterNode(run, id)) throw new Error("该路线当前不可抵达");
    const node = this.findNode(run, id); node.cleared = true; run.currentNodeId = node.id; run.visited.push(node.id); run.log.push(`抵达 ${node.type}`); return node;
  }
  getBossVariant(id) { return BOSS_VARIANTS.find((item) => item.id === id) ?? BOSS_VARIANTS[0]; }
  getLegendaryModules() { return allModules.filter((module) => !PLAYER_DISABLED_MODULE_IDS.has(module.id) && module.rarity === "legendary"); }
  getBeyondRewardModules({ elite = false } = {}) {
    const normal = allModules.filter((module) => !PLAYER_DISABLED_MODULE_IDS.has(module.id) && !fusionModuleIds.has(module.id) && !module.beyondFusionOnly && module.rarity !== "legendary" && (!elite || ["epic", "rare", "uncommon"].includes(module.rarity)));
    const fusion = allModules.filter((module) => !PLAYER_DISABLED_MODULE_IDS.has(module.id) && (module.beyondFusionOnly || fusionModuleIds.has(module.id)));
    return [...normal, ...fusion];
  }
  rewardModules(run, count = 1, { elite = false, boss = false, bossVariant = null } = {}) {
    if (boss) {
      const variantRewardId = this.getBossVariant(bossVariant ?? this.findNode(run, run.currentNodeId)?.bossVariant ?? run.map?.at(-1)?.[0]?.bossVariant).rewardId;
      const enabledLegendary = this.getLegendaryModules();
      const rewardId = PLAYER_DISABLED_MODULE_IDS.has(variantRewardId)
        ? choose(rngFrom(`${run.seed}:boss-reward:${run.visited.length}`), enabledLegendary)?.id
        : variantRewardId;
      if (!rewardId) return [];
      run.inventory[rewardId] = (run.inventory[rewardId] ?? 0) + 1;
      run.stats ??= {}; run.stats.modulesGained = (run.stats.modulesGained ?? 0) + 1;
      return [rewardId];
    }
    const rng = rngFrom(`${run.seed}:${run.visited.length}:${run.gold}:${count}`);
    const preferred = this.getBeyondRewardModules({ elite });
    const candidates = preferred.length ? preferred : this.getBeyondRewardModules();
    const rewards = Array.from({ length: count }, () => choose(rng, candidates).id);
    rewards.forEach((id) => { run.inventory[id] = (run.inventory[id] ?? 0) + 1; });
    run.stats ??= {};
    run.stats.modulesGained = (run.stats.modulesGained ?? 0) + rewards.length;
    return rewards;
  }
  getShopOffers(run, count = 3) {
    const rng = rngFrom(`${run.seed}:shop:${run.visited.length}`);
    return Array.from({ length: count }, () => {
      const module = choose(rng, this.getBeyondRewardModules());
      const cost = module.rarity === "epic" ? 68 : module.rarity === "rare" ? 45 : 28;
      return { id: module.id, cost };
    });
  }
  getEventChoiceState(run, choice) {
    const requirements = choice?.requirements ?? {};
    if ((requirements.gold ?? 0) > (run?.gold ?? 0)) return { available: false, reason: `需要 ${requirements.gold} 金币` };
    if ((requirements.hp ?? 0) >= (run?.hp ?? 0)) return { available: false, reason: "生命不足" };
    return { available: true, reason: "" };
  }
  createEventEncounter(run, node) {
    if (!run || node?.type !== "event") throw new Error("当前不是事件节点");
    const retained = run.activeEvent?.nodeId === node.id ? getBeyondEventById(run.activeEvent.eventId) : null;
    const history = new Set(run.eventHistory ?? []);
    const candidates = BEYOND_EVENTS.filter((event) => !history.has(event.id));
    const regular = candidates.filter((event) => !event.rareLegendary);
    const rare = candidates.filter((event) => event.rareLegendary);
    const rng = rngFrom(`${run.seed}:event:${run.visited.length}:${node.id}`);
    const pool = rng() < .08 && rare.length ? rare : (regular.length ? regular : candidates);
    const event = retained ?? getBeyondEventById(node.eventId) ?? choose(rng, pool);
    run.activeEvent = { nodeId: node.id, eventId: event.id };
    return { nodeId: node.id, event, choices: event.choices.map((item) => ({ ...item, ...this.getEventChoiceState(run, item) })) };
  }
  grantEventModules(run, count = 1, rarity = "any") {
    const pools = {
      any: this.getBeyondRewardModules(),
      rare: this.getBeyondRewardModules().filter((module) => ["rare", "epic", "legendary"].includes(module.rarity)),
      high: this.getBeyondRewardModules().filter((module) => ["epic", "legendary"].includes(module.rarity)),
    };
    const candidates = pools[rarity]?.length ? pools[rarity] : this.getBeyondRewardModules();
    const rng = rngFrom(`${run.seed}:event-reward:${run.visited.length}:${run.eventHistory?.length ?? 0}:${rarity}`);
    const rewards = Array.from({ length: count }, () => choose(rng, candidates).id);
    rewards.forEach((id) => { run.inventory[id] = (run.inventory[id] ?? 0) + 1; });
    run.stats ??= {};
    run.stats.modulesGained = (run.stats.modulesGained ?? 0) + rewards.length;
    return rewards;
  }
  applyEventEffects(run, effects, result, rng) {
    for (const effect of effects ?? []) {
      if (effect.type === "gold") {
        const amount = Number(effect.amount ?? 0);
        run.gold = Math.max(0, run.gold + amount);
        if (amount >= 0) { result.goldAmount += amount; run.stats.goldGained = (run.stats.goldGained ?? 0) + amount; }
        else run.stats.goldSpent = (run.stats.goldSpent ?? 0) + Math.abs(amount);
      } else if (effect.type === "hp") {
        const amount = Number(effect.amount ?? 0);
        const before = run.hp;
        run.hp = Math.round(Math.max(1, Math.min(BEYOND_LIGHT_CONE_CONFIG.maxPlayerHp, run.hp + amount)));
        const change = run.hp - before;
        if (change > 0) { result.healAmount += change; run.stats.healing = (run.stats.healing ?? 0) + change; }
        if (change < 0) result.damageAmount += Math.abs(change);
      } else if (effect.type === "module") {
        result.rewardIds.push(...this.grantEventModules(run, effect.count ?? 1, effect.rarity ?? "any"));
      } else if (effect.type === "legendary") {
        const candidates = this.getLegendaryModules();
        const module = choose(rng, candidates);
        if (module) { run.inventory[module.id] = (run.inventory[module.id] ?? 0) + 1; run.stats.modulesGained = (run.stats.modulesGained ?? 0) + 1; result.rewardIds.push(module.id); result.variants.push(`获得传说模块：${module.name}`); }
      } else if (effect.type === "duplicate") {
        const candidates = Object.entries(run.inventory ?? {}).filter(([id, amount]) => amount > 0 && getModuleById(id));
        if (candidates.length) {
          const [id] = choose(rng, candidates);
          run.inventory[id] = (run.inventory[id] ?? 0) + 1;
          run.stats.modulesGained = (run.stats.modulesGained ?? 0) + 1;
          result.rewardIds.push(id);
          result.variants.push(`复制了 ${getModuleById(id)?.name ?? "模块"}`);
        } else {
          run.gold += 18;
          run.stats.goldGained = (run.stats.goldGained ?? 0) + 18;
          result.goldAmount += 18;
        }
      } else if (effect.type === "battle") {
        result.battle = true;
        result.battleElite ||= Boolean(effect.elite);
      } else if (effect.type === "random") {
        const outcome = choose(rng, effect.outcomes ?? []);
        if (outcome) {
          if (outcome.label) result.variants.push(outcome.label);
          this.applyEventEffects(run, outcome.effects, result, rng);
        }
      }
    }
  }
  resolveEventChoice(run, node, eventId, choiceId) {
    if (!run || node?.type !== "event") throw new Error("事件数据无效");
    const event = getBeyondEventById(eventId);
    const choice = event?.choices.find((item) => item.id === choiceId);
    if (!event || !choice || run.activeEvent?.nodeId !== node.id || run.activeEvent?.eventId !== event.id) throw new Error("事件已失效，请重新进入节点");
    const state = this.getEventChoiceState(run, choice);
    if (!state.available) throw new Error(state.reason);
    run.stats ??= {};
    const result = { node, event, choice, rewardIds: [], goldAmount: 0, healAmount: 0, damageAmount: 0, variants: [], battle: false, battleElite: false, message: "" };
    this.applyEventEffects(run, choice.effects, result, rngFrom(`${run.seed}:event-choice:${node.id}:${event.id}:${choice.id}`));
    if (result.battle) {
      run.eventState.combatStreak = (run.eventState.combatStreak ?? 0) + 1;
      run.eventState.peacefulStreak = 0;
    } else {
      run.eventState.peacefulStreak = (run.eventState.peacefulStreak ?? 0) + 1;
      run.eventState.combatStreak = 0;
    }
    run.eventHistory = [...(run.eventHistory ?? []), event.id];
    run.activeEvent = null;
    const gains = [
      result.goldAmount ? `获得 ${result.goldAmount} 金币` : "",
      result.healAmount ? `恢复 ${result.healAmount} 生命` : "",
      result.damageAmount ? `损失 ${result.damageAmount} 生命` : "",
      result.rewardIds.length ? `获得模块 ×${result.rewardIds.length}` : "",
      result.battle ? (result.battleElite ? "触发精英战斗" : "触发战斗") : "",
      ...result.variants,
    ].filter(Boolean);
    result.message = `${event.title}：${gains.join("，") || "没有发生变化"}`;
    return result;
  }
  resolvePeacefulNode(run, node) {
    const result = { node, rewardIds: [], message: "" };
    if (node.type === "rest") { run.hp = Math.round(Math.min(BEYOND_LIGHT_CONE_CONFIG.maxPlayerHp, run.hp + 34)); result.message = "机体已修复 34 点生命"; }
    else if (node.type === "shop") { result.message = "商店已开启：消耗金币可购买模块"; }
    else if (node.type === "event") {
      const forceCombat = run.eventState.peacefulStreak >= 2;
      const rng = rngFrom(`${run.seed}:event:${run.visited.length}`);
      const outcome = forceCombat ? "combat" : choose(rng, ["gold", "module", "combat", "heal"]);
      if (outcome === "combat") { run.eventState.combatStreak += 1; run.eventState.peacefulStreak = 0; result.battle = true; result.message = "未知信号演化为战斗"; }
      else { run.eventState.peacefulStreak += 1; run.eventState.combatStreak = 0; if (outcome === "gold") { run.gold += 32; result.message = "获得 32 金币"; } if (outcome === "module") { result.rewardIds = this.rewardModules(run, 1); result.message = "获得一个模块"; } if (outcome === "heal") { run.hp = Math.round(Math.min(BEYOND_LIGHT_CONE_CONFIG.maxPlayerHp, run.hp + 18)); result.message = "恢复 18 点生命"; } }
    }
    return result;
  }
  resolvePeacefulNodeDetailed(run, node) {
    const result = { node, rewardIds: [], goldAmount: 0, healAmount: 0, message: "" };
    if (node.type === "rest") {
      const before = run.hp;
      run.hp = Math.round(Math.min(BEYOND_LIGHT_CONE_CONFIG.maxPlayerHp, run.hp + 34));
      result.healAmount = run.hp - before;
      result.message = `恢复 ${result.healAmount} 点生命`;
    } else if (node.type === "shop") {
      result.message = "商店已开启：消耗金币购买模块";
    } else if (node.type === "event") {
      const forceCombat = run.eventState.peacefulStreak >= 2;
      const rng = rngFrom(`${run.seed}:event:${run.visited.length}`);
      const outcome = forceCombat ? "combat" : choose(rng, ["gold", "module", "combat", "heal"]);
      if (outcome === "combat") {
        run.eventState.combatStreak += 1;
        run.eventState.peacefulStreak = 0;
        result.battle = true;
        result.message = "未知信号演化为战斗";
      } else {
        run.eventState.peacefulStreak += 1;
        run.eventState.combatStreak = 0;
        if (outcome === "gold") {
          result.goldAmount = 32;
          run.gold += result.goldAmount;
          run.stats ??= {};
          run.stats.goldGained = (run.stats.goldGained ?? 0) + result.goldAmount;
          result.message = `获得 ${result.goldAmount} 金币`;
        } else if (outcome === "module") {
          result.rewardIds = this.rewardModules(run, 1);
          result.message = "事件奖励：获得模块";
        } else {
          const before = run.hp;
          run.hp = Math.round(Math.min(BEYOND_LIGHT_CONE_CONFIG.maxPlayerHp, run.hp + 18));
          result.healAmount = run.hp - before;
          run.stats ??= {};
          run.stats.healing = (run.stats.healing ?? 0) + result.healAmount;
          result.message = `恢复 ${result.healAmount} 点生命`;
        }
      }
    }
    return result;
  }

  getBattleConfig(run, node) {
    const diff = getBeyondDifficulty(run.difficulty); const depth = node.layer; const chapter = Math.max(1, run.chapter ?? 1); const chapterOffset = chapter - 1;
    const globalDepth = chapterOffset * BEYOND_LIGHT_CONE_CONFIG.layers + depth;
    const elite = node.type === "elite"; const boss = node.type === "boss";
    const hpProgression = 1 + globalDepth * (diff.chapterHpStep ?? 0) / BEYOND_LIGHT_CONE_CONFIG.layers;
    const damageProgression = 1 + globalDepth * (diff.chapterDamageStep ?? 0) / BEYOND_LIGHT_CONE_CONFIG.layers;
    const spawnProgression = 1 + globalDepth * (diff.chapterSpawnStep ?? 0) / BEYOND_LIGHT_CONE_CONFIG.layers;
    const specialEnemyCount = elite || boss
      ? diff.level >= 4 ? (boss ? 8 : 6) : diff.level >= 3 ? 3 : 2
      : 0;
    return {
      nodeType: node.type, level: 5 + globalDepth * 3 + diff.level * 2,
      targetScore: boss ? Math.round(1000 + globalDepth * 140) : Math.round((260 + globalDepth * 95) * (elite ? 1.5 : 1)),
      boss,
      bossVariant: boss ? this.getBossVariant(node.bossVariant).id : null,
      hpMultiplier: +(diff.hpMultiplier * hpProgression * (1 + globalDepth * .065) * (elite ? 1.28 : 1)).toFixed(2),
      damageMultiplier: +(diff.damageMultiplier * damageProgression).toFixed(2),
      speedMultiplier: +(1 + (diff.level - 1) * .035 + globalDepth * .018).toFixed(2),
      spawnInterval: Math.max(.42, 1.28 / (diff.spawnMultiplier * spawnProgression) - globalDepth * .025 - (elite ? .1 : 0)),
      minimumSpawnInterval: Math.max(.34, .7 / (diff.spawnMultiplier * spawnProgression)),
      enemyPool: [...ENEMY_CONFIG, ...ADVANCED_ENEMY_CONFIG],
      specialEnemyPool: ENABLED_PROTOTYPE_ENEMY_CONFIG,
      specialEnemyCount,
      chapter,
      totalChapters: run.totalChapters ?? 1,
      environmentPool: getBeyondEnvironmentPool(),
      environment: { firstDelay: elite || boss ? 4.5 : 7, interval: boss ? 10 : elite ? 12 : 15 },
    };
  }
  encode(run) {
    const raw = textEncoder.encode(JSON.stringify(this.compactRun(run))); const scrambled = raw.map((byte, index) => byte ^ CODE_KEY[index % CODE_KEY.length] ^ ((index * 31) & 255));
    let binary = ""; scrambled.forEach((byte) => { binary += String.fromCharCode(byte); });
    return `◇${btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")}`;
  }
  decode(code) {
    const cleaned = String(code ?? "").trim().replace(/^◇/, ""); if (!cleaned) throw new Error("存档码为空");
    const normalized = cleaned.replaceAll("-", "+").replaceAll("_", "/"); const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
    const bytes = Uint8Array.from(binary, (char, index) => char.charCodeAt(0) ^ CODE_KEY[index % CODE_KEY.length] ^ ((index * 31) & 255)); const run = JSON.parse(textDecoder.decode(bytes));
    if (!run?.s || !Array.isArray(run?.p)) throw new Error("存档码格式不正确");
    return this.expandRun(run);
  }
  compactRun(run) {
    const point = (id) => { const node = this.findNode(run, id); return node ? [node.layer, run.map[node.layer].findIndex((item) => item.id === node.id)] : null; };
    const entries = run.loadout?.modules ?? []; const instanceToIndex = new Map(entries.map((entry, index) => [entry.instanceId, index]));
    return {
      v: 4, s: run.seed, d: run.difficulty, k: run.chapter ?? 1, u: run.totalChapters ?? getBeyondChapterCount(run.difficulty), m: run.chapterSeed ?? `${run.seed}:chapter:${run.chapter ?? 1}`, c: point(run.currentNodeId), p: run.visited.map(point).filter(Boolean),
      g: Math.round(run.gold), h: Math.round(run.hp), i: Object.entries(run.inventory ?? {}).map(([id, count]) => [moduleCode(id), count]).filter(([code]) => code >= 0),
      b: entries.map((entry) => [moduleCode(entry.moduleId), entry.x, entry.y, entry.rotation ?? 0]),
      y: (run.loadout?.synergies ?? []).map((synergy) => [synergy.id, (synergy.moduleInstanceIds ?? []).map((id) => instanceToIndex.get(id)).filter(Number.isInteger)]),
      e: run.eventState ?? {}, r: run.eventHistory ?? [], a: run.activeEvent ? [point(run.activeEvent.nodeId), run.activeEvent.eventId] : null, t: run.currentBattle ? [Math.round(run.currentBattle.score ?? 0), Math.round(run.currentBattle.elapsed ?? 0), point(run.currentBattle.nodeId)] : null,
      q: run.stats ?? {},
    };
  }
  expandRun(data) {
    const chapter = Math.max(1, Number(data.k ?? 1));
    const totalChapters = Math.max(chapter, Number(data.u ?? getBeyondChapterCount(data.d)));
    const chapterSeed = data.m ?? ((data.v ?? 1) >= 3 ? `${data.s}:chapter:${chapter}` : data.s);
    const map = this.generateMap(chapterSeed, chapter); const nodeAt = (point) => Array.isArray(point) ? map[point[0]]?.[point[1]]?.id ?? null : null;
    // 兼容旧存档：历史奖励节点统一转为事件节点，避免重新出现已移除的节点类型。
    map.flat().forEach((node) => { if (node.type === "reward") node.type = "event"; });
    const modules = (data.b ?? []).map((entry, index) => ({ instanceId: `b${index}`, moduleId: moduleIdFromCode(entry[0]), x: entry[1], y: entry[2], rotation: entry[3] ?? 0 })).filter((entry) => entry.moduleId);
    const synergies = (data.y ?? []).map(([id, indexes = []]) => ({ id, moduleInstanceIds: indexes.map((index) => `b${index}`).filter((instanceId) => modules.some((entry) => entry.instanceId === instanceId)) }));
    const inventory = Object.fromEntries((data.i ?? []).map(([code, count]) => [moduleIdFromCode(code), count]).filter(([id]) => id));
    const visited = (data.p ?? []).map(nodeAt).filter(Boolean); visited.forEach((id) => { const node = map.flat().find((item) => item.id === id); if (node) node.cleared = true; });
    const difficulty = getBeyondDifficulty(data.d, { preferLegacy: (data.v ?? 1) < 2 }).level;
    const activeEventNodeId = Array.isArray(data.a?.[0]) ? nodeAt(data.a[0]) : null;
    const activeEvent = activeEventNodeId && getBeyondEventById(data.a?.[1]) ? { nodeId: activeEventNodeId, eventId: data.a[1] } : null;
    const stats = data.q ?? { nodes: { combat: 0, elite: 0, boss: 0, shop: 0, rest: 0, event: 0 }, routeLength: visited.length, battles: 0, totalElapsed: 0, modulesGained: 0, goldGained: 0, goldSpent: 0, healing: 0 };
    return { version: data.v ?? 1, seed: data.s, difficulty, chapter, totalChapters, chapterSeed, map, currentNodeId: nodeAt(data.c), visited, gold: Math.round(data.g ?? 0), hp: Math.round(data.h ?? BEYOND_LIGHT_CONE_CONFIG.maxPlayerHp), inventory, loadout: createLoadout({ modules, synergies }), stats, eventState: data.e ?? { combatStreak: 0, peacefulStreak: 0 }, eventHistory: Array.isArray(data.r) ? data.r.filter((id) => getBeyondEventById(id)) : [], activeEvent, currentBattle: data.t ? { score: data.t[0], elapsed: data.t[1], nodeId: nodeAt(data.t[2]) } : null, log: ["已从存档继续航程"], completed: false };
  }
  getFusionRecipes() { return allModules.filter((module) => Array.isArray(module.fusionRecipe) && module.fusionRecipe.length); }
  getFreeInventory(run) {
    const installed = new Map();
    getInstalledEntries(run?.loadout).forEach(({ module }) => { if (module?.id && module.type !== "core") installed.set(module.id, (installed.get(module.id) ?? 0) + 1); });
    return Object.fromEntries(Object.entries(run?.inventory ?? {}).map(([id, count]) => [id, Math.max(0, count - (installed.get(id) ?? 0))]));
  }
  matchFusionRecipe(slots = []) {
    const grid = Array.from({ length: 9 }, (_, index) => slots[index] ?? null);
    for (const product of this.getFusionRecipes()) {
      const recipe = product.fusionRecipe;
      const maxX = Math.max(...recipe.map((item) => item.x)); const maxY = Math.max(...recipe.map((item) => item.y));
      for (let offsetY = 0; offsetY <= 2 - maxY; offsetY += 1) for (let offsetX = 0; offsetX <= 2 - maxX; offsetX += 1) {
        const expected = Array(9).fill(null);
        recipe.forEach((item) => { expected[(item.y + offsetY) * 3 + item.x + offsetX] = item.moduleId; });
        if (expected.every((id, index) => id === grid[index])) return product;
      }
    }
    return null;
  }
  synthesize(run, slots = []) {
    if (!run) throw new Error("航程不存在");
    const product = this.matchFusionRecipe(slots);
    if (!product) throw new Error("当前摆放不符合任何合成配方");
    const required = slots.filter(Boolean).reduce((map, id) => map.set(id, (map.get(id) ?? 0) + 1), new Map());
    const free = this.getFreeInventory(run);
    for (const [id, count] of required) if ((free[id] ?? 0) < count) throw new Error(`${getModuleById(id)?.name ?? id} 的未装配库存不足`);
    for (const [id, count] of required) run.inventory[id] -= count;
    run.inventory[product.id] = (run.inventory[product.id] ?? 0) + 1;
    run.stats ??= {}; run.stats.modulesGained = (run.stats.modulesGained ?? 0) + 1;
    run.log?.push(`合成 ${product.name}`);
    return { product, consumed: [...required.entries()].map(([id, count]) => ({ id, count })) };
  }
  decompose(run, moduleId) {
    const module = getModuleById(moduleId);
    if (!run || !module?.fusionRecipe?.length) throw new Error("只能分解已合成模块");
    const free = this.getFreeInventory(run);
    if ((free[moduleId] ?? 0) < 1) throw new Error("该合成模块已装配或库存不足");
    run.inventory[moduleId] -= 1;
    const returned = module.fusionRecipe.reduce((map, item) => map.set(item.moduleId, (map.get(item.moduleId) ?? 0) + 1), new Map());
    for (const [id, count] of returned) run.inventory[id] = (run.inventory[id] ?? 0) + count;
    run.log?.push(`分解 ${module.name}`);
    return { module, returned: [...returned.entries()].map(([id, count]) => ({ id, count })) };
  }
  getInventoryRows(run) { const free = this.getFreeInventory(run); return Object.entries(run?.inventory ?? {}).filter(([, count]) => count > 0).map(([id, count]) => ({ id, name: getModuleById(id)?.name ?? id, count, free: free[id] ?? 0 })); }
}
