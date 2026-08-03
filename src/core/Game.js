import { GAME_CONFIG, IMPACT_CONFIG, PLAYER_BASE_STATS, SONIC_WAVE_CONFIG } from "../config/game-config.js";
import { LEVEL_CONFIG, getLevelConfig } from "../config/level-config.js";
import { createBossDefinition, getEnemyById } from "../config/enemy-config.js";
import { getEnvironmentPool } from "../config/environment-config.js";
import { ModuleSystem } from "../systems/ModuleSystem.js";
import { getPlayerAttackSpeed, WeaponSystem } from "../systems/WeaponSystem.js";
import { SkillSystem } from "../systems/SkillSystem.js";
import { EnemySpawner } from "../systems/EnemySpawner.js";
import { CollisionSystem } from "../systems/CollisionSystem.js";
import { SoundSystem } from "../systems/SoundSystem.js";
import { Player } from "../entities/Player.js";
import { Wingman } from "../entities/Wingman.js";
import { Decoy } from "../entities/Decoy.js";
import { Enemy } from "../entities/Enemy.js";
import { Projectile } from "../entities/Projectile.js";
import { getDodgeDifficulty } from "../config/dodge-config.js";
import { hasActiveSynergy } from "../config/synergy-config.js";
import { BeyondLightConeSystem } from "../systems/BeyondLightConeSystem.js";
import { BEYOND_LIGHT_CONE_CONFIG } from "../config/beyond-light-cone-config.js";

const ELEMENT_DAMAGE_COLORS = { neutral: "#f4fbff", electric: "#fff34d", light: "#fff8cf", dark: "#9d2639", ice: "#a6eaff", water: "#2468ff", fire: "#ff3b32" };

export class Game {
  constructor({ canvas, input, ui }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = input;
    this.ui = ui;
    this.bounds = GAME_CONFIG.canvas;
    this.moduleSystem = new ModuleSystem();
    this.weaponSystem = new WeaponSystem();
    this.collisionSystem = new CollisionSystem();
    this.sound = new SoundSystem();
    this.beyondSystem = new BeyondLightConeSystem();
    this.beyondRun = null;
    this.beyondPendingResult = null;
    this.beyondBattleNode = null;
    this.beyondBattleCheckpoint = null;
    this.beyondEventCheckpoint = null;
    this.beyondPendingChapterTransition = false;
    this.audioInteractionArmed = false;
    this.animationFrame = null;
    this.state = "menu";
    this.elapsed = 0;
    this.score = 0;
    this.enemies = [];
    this.projectiles = [];
    this.explosions = [];
    this.lasers = [];
    this.decoys = [];
    this.wingman = null;
    this.freezeTimer = 0;
    this.polarityWindow = 0;
    this.whiteHoleActive = false;
    this.whiteHoleHealing = null;
    this.ionSaw = { active: false, damage: 1, damageTimer: 0 };
    this.sonicWaves = [];
    this.damageNumbers = [];
    this.damageNumbersEnabled = true;
    this.countdownEnabled = true;
    this.vibrationEnabled = true;
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeStrength = 0;
    this.stars = Array.from({ length: GAME_CONFIG.stars.count }, () => ({
      x: Math.random() * this.bounds.width, y: Math.random() * this.bounds.height,
      size: 0.6 + Math.random() * 1.8, speed: GAME_CONFIG.stars.speedMin + Math.random() * (GAME_CONFIG.stars.speedMax - GAME_CONFIG.stars.speedMin),
      alpha: 0.25 + Math.random() * 0.65,
    }));
    this.ui.bind({ onStart: (spec) => this.start(spec), onMenu: () => this.toMenu(), onPause: () => this.pause(), onResume: () => this.resume(), onSkill: (index) => this.activateSkill(index), onDamageNumbersChanged: (enabled) => { this.damageNumbersEnabled = enabled; if (!enabled) this.damageNumbers = []; }, onVibrationChanged: (enabled) => { this.vibrationEnabled = enabled; }, onCountdownChanged: (enabled) => { this.countdownEnabled = enabled; }, onMusicVolumeChanged: (value) => this.sound.setMusicVolume(value), onSoundVolumeChanged: (value) => this.sound.setSoundVolume(value), onNextLevel: () => this.start({ ...this.ui.getSelectedIds(), mode: "levels", level: Math.min(50, this.levelNumber + 1) }), onBeyondStageContinue: () => this.continueBeyondStage(), onLevelSelect: () => this.toLevelSelect(), onModeSelect: () => this.toModeSelect(), onTutorialBattleExit: () => this.exitTutorialBattle(), onEnvironmentPause: () => this.pauseForEnvironment(), onEnvironmentResume: () => this.resumeFromEnvironment() });
    this.bindBeyondLightConeEvents();
    this.ui.onBeyondPauseReturn = () => {
      if (this.mode !== "beyond") return false;
      this.ui.hidePause();
      this.restoreBeyondBattleCheckpoint();
      this.toBeyondMap();
      return true;
    };
    this.armAudioInteraction();
    this.input.setSkillHandler((index) => this.activateSkill(index));
    this.render();
  }

  bindBeyondLightConeEvents() {
    const screen = this.ui.beyondScreen;
    if (!screen) return;
    screen.addEventListener("beyond:open", () => this.openBeyondLightCone());
    screen.addEventListener("beyond:new", (event) => this.createBeyondRun(event.detail.difficulty));
    screen.addEventListener("beyond:load", (event) => this.loadBeyondRun(event.detail.code));
    screen.addEventListener("beyond:node", (event) => this.enterBeyondNodeWithResult(event.detail.id));
    screen.addEventListener("beyond:event-choice", (event) => this.chooseBeyondEvent(event.detail));
    screen.addEventListener("beyond:build", () => this.openBeyondBuilder());
    screen.addEventListener("beyond:build-save", (event) => this.saveBeyondBuild(event.detail.loadout));
    screen.addEventListener("beyond:save", () => this.exportBeyondRun());
    screen.addEventListener("beyond:shop-buy", (event) => this.buyBeyondShopOffer(event.detail.index));
    screen.addEventListener("beyond:shop-close", () => this.toBeyondMap());
    screen.addEventListener("beyond:result-continue", (event) => this.continueBeyondResult(event.detail.action));
    screen.addEventListener("beyond:complete-exit", () => {
      this.beyondRun = null;
      this.beyondBattleNode = null;
      this.ui.hideBeyondComplete?.();
      this.toMenu();
    });
    screen.addEventListener("beyond:exit", () => { this.beyondRun = null; this.toMenu(); });
    const pauseSave = document.createElement("button");
    pauseSave.type = "button"; pauseSave.className = "secondary-button is-hidden"; pauseSave.textContent = "复制航程存档码";
    this.ui.pauseOverlay?.querySelector(".pause-card")?.insertBefore(pauseSave, this.ui.pauseReturnButton);
    pauseSave.addEventListener("click", async () => { const code = this.getBeyondSaveCode(); if (!code) return; try { await navigator.clipboard.writeText(code); pauseSave.textContent = "存档码已复制"; } catch { pauseSave.textContent = "请从路线图复制存档码"; } });
    this.beyondPauseSaveButton = pauseSave;
  }
  openBeyondLightCone() { this.stopLoop(); this.state = "menu"; this.ui.showBeyondStart(); }
  createBeyondRun(difficulty) { this.beyondRun = this.beyondSystem.createRun(difficulty); this.beyondPendingResult = null; this.beyondBattleCheckpoint = null; this.beyondEventCheckpoint = null; this.beyondPendingChapterTransition = false; this.toBeyondMap(); }
  loadBeyondRun(code) { try { this.beyondRun = this.beyondSystem.decode(code); this.beyondPendingResult = null; this.beyondBattleCheckpoint = null; this.beyondEventCheckpoint = null; this.beyondPendingChapterTransition = false; this.ui.closeBeyondSave?.(); this.toBeyondMap(); } catch (error) { this.ui.setBeyondSaveCode?.("", error instanceof Error ? error.message : "存档码无效", "import"); } }
  toBeyondMap() {
    this.stopLoop(); this.state = "menu";
    if (!this.beyondRun) { this.ui.showBeyondStart(); return; }
    this.ui.showBeyondRun(this.beyondRun, this.beyondSystem.getAvailableNodes(this.beyondRun));
    if (this.beyondRun.activeEvent) {
      const node = this.beyondSystem.findNode(this.beyondRun, this.beyondRun.activeEvent.nodeId);
      if (node) this.ui.showBeyondEvent?.(this.beyondSystem.createEventEncounter(this.beyondRun, node));
    }
  }
  openBeyondBuilder() { if (this.beyondRun) this.ui.showBeyondBuilder(this.beyondRun); }
  saveBeyondBuild(spec) { if (!this.beyondRun) return; this.beyondRun.loadout = this.moduleSystem.install(spec); this.toBeyondMap(); }
  exportBeyondRun() { const code = this.getBeyondSaveCode(); if (code) this.ui.setBeyondSaveCode?.(code); }
  getBeyondSaveCode() { if (!this.beyondRun) return null; if (this.mode === "beyond" && this.player) { this.beyondRun.hp = Math.max(0, this.player.hp); this.beyondRun.currentBattle = { score: this.score, elapsed: this.elapsed, nodeId: this.beyondBattleNode?.id ?? null }; } return this.beyondSystem.encode(this.beyondRun); }
  enterBeyondNode(id) { if (!this.beyondRun) return; try { const node = this.beyondSystem.enterNode(this.beyondRun, id); this.beyondBattleNode = node; if (["combat", "elite", "boss"].includes(node.type)) { this.startBeyondBattle(node); return; } if (node.type === "shop") { this.beyondShopOffers = this.beyondSystem.getShopOffers(this.beyondRun); this.ui.showBeyondShop?.(this.beyondRun, this.beyondShopOffers); return; } const result = this.beyondSystem.resolvePeacefulNode(this.beyondRun, node); if (result.battle) { this.startBeyondBattle({ ...node, type: "combat" }); return; } this.beyondRun.log.push(result.message); this.toBeyondMap(); } catch (error) { console.warn("无法进入光锥节点", error); } }
  buyBeyondShopOffer(index) { const offer = this.beyondShopOffers?.[index]; if (!offer || !this.beyondRun || this.beyondRun.gold < offer.cost) return; this.beyondRun.gold -= offer.cost; this.beyondRun.inventory[offer.id] = (this.beyondRun.inventory[offer.id] ?? 0) + 1; this.beyondRun.log.push(`商店购入 ${offer.id}`); this.beyondShopOffers.splice(index, 1); this.ui.showBeyondShop?.(this.beyondRun, this.beyondShopOffers); }
  ensureBeyondStats() {
    if (!this.beyondRun) return null;
    this.beyondRun.stats ??= {};
    this.beyondRun.stats.nodes ??= {};
    return this.beyondRun.stats;
  }

  recordBeyondNodeVisit(node) {
    const stats = this.ensureBeyondStats();
    if (!stats || !node) return;
    stats.nodes[node.type] = (stats.nodes[node.type] ?? 0) + 1;
  }

  recordBeyondBattleStart(node) {
    const stats = this.ensureBeyondStats();
    if (!stats || !node) return;
    stats.battles = (stats.battles ?? 0) + 1;
  }

  buildBeyondCompletionSummary(rewards, goldReward) {
    const run = this.beyondRun;
    const stats = run?.stats ?? {};
    const nodes = stats.nodes ?? {};
    return {
      score: this.score,
      elapsed: this.elapsed,
      difficulty: run?.difficulty ?? 1,
      routeLength: run?.visited?.length ?? 0,
      battles: stats.battles ?? 0,
      events: nodes.event ?? 0,
      shops: nodes.shop ?? 0,
      rests: nodes.rest ?? 0,
      modulesGained: stats.modulesGained ?? rewards.length,
      goldGained: stats.goldGained ?? goldReward,
      goldSpent: stats.goldSpent ?? 0,
      finalGold: run?.gold ?? goldReward,
      healing: stats.healing ?? 0,
      rewardIds: rewards,
    };
  }

  startBeyondBattle(node) { const config = this.beyondSystem.getBattleConfig(this.beyondRun, node); this.start({ modules: this.beyondRun.loadout.modules.map(({ instanceId, moduleId, x, y, rotation }) => ({ instanceId, moduleId, x, y, rotation })), synergies: this.beyondRun.loadout.synergies, mode: "beyond", beyondConfig: config, beyondNode: node }); }
  finishBeyondBattle(victory) { const node = this.beyondBattleNode; if (!this.beyondRun || !node) { this.toBeyondMap(); return; } this.beyondRun.hp = Math.max(0, this.player?.hp ?? this.beyondRun.hp); if (!victory) { this.beyondRun = null; this.ui.showGameOver({ score: this.score, elapsed: this.elapsed, victory: false, mode: "beyond" }); return; } const elite = node.type === "elite"; const boss = node.type === "boss"; const rewards = this.beyondSystem.rewardModules(this.beyondRun, boss || elite ? 2 : 1, { elite, boss }); this.beyondRun.gold += boss ? 100 : elite ? 55 : 24; this.beyondRun.log.push(`${node.type} 胜利：${rewards.length} 个模块`); if (boss) { this.beyondRun.completed = true; this.beyondRun = null; this.ui.showGameOver({ score: this.score, elapsed: this.elapsed, victory: true, level: null, mode: "beyond" }); return; } this.ui.showBeyondStageComplete?.({ score: this.score, elapsed: this.elapsed, node, rewards }); }

  handleCombatError(error, phase = "战斗") {
    console.error(`${phase}异常`, error);
    this.stopLoop();
    this.state = "menu";
    this.ui.showBuilder();
    this.ui.setStatus(`${phase}无法继续：${error instanceof Error ? error.message : "请检查机体装配"}`);
    this.render();
  }

  restoreBeyondBattleCheckpoint() {
    const checkpoint = this.beyondBattleCheckpoint;
    const run = this.beyondRun;
    if (!checkpoint || !run) return;
    run.currentNodeId = checkpoint.currentNodeId;
    run.visited.length = checkpoint.visitedLength;
    const node = this.beyondSystem.findNode(run, checkpoint.nodeId);
    if (node) node.cleared = false;
    run.activeEvent = checkpoint.activeEvent ?? null;
    this.beyondBattleCheckpoint = null;
    this.beyondBattleNode = null;
  }

  continueBeyondResult(action = "map") {
    const pending = this.beyondPendingResult;
    this.beyondPendingResult = null;
    this.ui.hideBeyondResult?.();
    if (action === "combat" && pending?.battleNode) {
      this.startBeyondBattle(pending.battleNode);
      return;
    }
    this.toBeyondMap();
  }

  continueBeyondStage() {
    const shouldAdvance = this.beyondPendingChapterTransition;
    this.beyondPendingChapterTransition = false;
    this.ui.closeBeyondStageComplete?.(() => {
      if (shouldAdvance) this.toBeyondMap();
      else this.toBeyondMap();
    });
  }

  enterBeyondNodeWithResult(id) {
    if (!this.beyondRun) return;
    try {
      const checkpoint = { currentNodeId: this.beyondRun.currentNodeId, visitedLength: this.beyondRun.visited.length, nodeId: id, activeEvent: this.beyondRun.activeEvent ?? null };
      const node = this.beyondSystem.enterNode(this.beyondRun, id);
      this.beyondBattleNode = node;
      this.recordBeyondNodeVisit(node);
      if (["combat", "elite", "boss"].includes(node.type)) {
        this.beyondBattleCheckpoint = checkpoint;
        this.recordBeyondBattleStart(node);
        this.startBeyondBattle(node);
        return;
      }
      if (node.type === "shop") {
        this.beyondShopOffers = this.beyondSystem.getShopOffers(this.beyondRun);
        this.ui.showBeyondShop?.(this.beyondRun, this.beyondShopOffers);
        return;
      }
      if (node.type === "event") {
        this.beyondEventCheckpoint = checkpoint;
        this.ui.showBeyondEvent?.(this.beyondSystem.createEventEncounter(this.beyondRun, node));
        return;
      }
      const result = this.beyondSystem.resolvePeacefulNodeDetailed(this.beyondRun, node);
      this.beyondRun.log.push(result.message);
      if (result.battle) {
        const battleNode = { ...node, type: "combat" };
        this.beyondBattleCheckpoint = checkpoint;
        this.beyondPendingResult = { battleNode };
        this.recordBeyondBattleStart(battleNode);
        this.toBeyondMap();
        this.ui.showBeyondResult?.({ node, result, action: "combat" });
        return;
      }
      this.toBeyondMap();
      this.ui.showBeyondResult?.({ node, result, action: "map" });
    } catch (error) {
      console.warn("无法进入光锥节点", error);
    }
  }

  chooseBeyondEvent({ nodeId, eventId, choiceId } = {}) {
    if (!this.beyondRun) return;
    try {
      const node = this.beyondSystem.findNode(this.beyondRun, nodeId);
      const result = this.beyondSystem.resolveEventChoice(this.beyondRun, node, eventId, choiceId);
      this.beyondRun.log.push(result.message);
      this.ui.hideBeyondEvent?.();
      if (result.battle) {
        const battleNode = { ...node, type: result.battleElite ? "elite" : "combat", eventId, eventTitle: result.event.title };
        this.beyondBattleNode = battleNode;
        this.beyondBattleCheckpoint = this.beyondEventCheckpoint ?? null;
        this.beyondEventCheckpoint = null;
        this.recordBeyondBattleStart(battleNode);
        this.startBeyondBattle(battleNode);
        return;
      }
      this.beyondEventCheckpoint = null;
      this.toBeyondMap();
      this.ui.showBeyondResult?.({ node, result, action: "map" });
    } catch (error) {
      this.ui.showBeyondEventError?.(error instanceof Error ? error.message : "事件处理失败");
    }
  }

  finishBeyondBattleWithRewards(victory) {
    const node = this.beyondBattleNode;
    if (!this.beyondRun || !node) { this.toBeyondMap(); return; }
    this.beyondRun.hp = Math.max(0, this.player?.hp ?? this.beyondRun.hp);
    if (!victory) {
      const summary = this.buildBeyondCompletionSummary([], 0);
      this.beyondRun = null;
      this.ui.showBeyondComplete?.({ summary, victory: false });
      return;
    }
    this.beyondBattleCheckpoint = null;
    const elite = node.type === "elite";
    const boss = node.type === "boss";
    const rewards = boss ? [] : this.beyondSystem.rewardModules(this.beyondRun, elite ? 2 : 1, { elite, boss });
    const goldReward = boss ? 0 : elite ? 55 : 24;
    this.beyondRun.gold += goldReward;
    this.beyondRun.stats ??= {};
    this.beyondRun.stats.goldGained = (this.beyondRun.stats.goldGained ?? 0) + goldReward;
    this.beyondRun.log.push(`${node.type} 胜利：${rewards.length} 个模块，${goldReward} 金币`);
    if (boss) {
      if ((this.beyondRun.chapter ?? 1) < (this.beyondRun.totalChapters ?? 1)) {
        this.beyondSystem.advanceChapter(this.beyondRun);
        this.beyondPendingChapterTransition = true;
        this.ui.showBeyondStageComplete?.({ score: this.score, elapsed: this.elapsed, node, rewards: [], goldReward: 0, chapterComplete: true, chapter: this.beyondRun.chapter - 1, totalChapters: this.beyondRun.totalChapters });
        return;
      }
      this.beyondRun.completed = true;
      const summary = this.buildBeyondCompletionSummary(rewards, goldReward);
      this.ui.gameOverScreen?.classList.add("is-hidden");
      this.ui.showBeyondComplete?.({ summary });
      return;
    }
    this.ui.showBeyondStageComplete?.({ score: this.score, elapsed: this.elapsed, node, rewards, goldReward });
    this.ui.showBeyondBattleRewards?.(rewards, goldReward);
  }

  start(spec) {
    this.stopLoop();
    this.ui.hideBeyondBattleRewards?.();
    try {
    this.sound.unlock();
    this.sound.startMusic();
    const loadout = this.moduleSystem.install(spec);
    const stats = this.moduleSystem.calculateStats(spec?.mode === "beyond" ? { ...PLAYER_BASE_STATS, maxHp: BEYOND_LIGHT_CONE_CONFIG.maxPlayerHp } : PLAYER_BASE_STATS, loadout);
    this.player = new Player({ x: this.bounds.width / 2, y: this.bounds.height - 92, stats, loadout });
    this.mode = spec?.mode ?? "endless";
    if (this.ui.pauseReturnButton) this.ui.pauseReturnButton.textContent = this.mode === "beyond" ? "返回路线图" : "返回主菜单";
    this.beyondConfig = this.mode === "beyond" ? spec?.beyondConfig ?? null : null;
    this.beyondBattleNode = this.mode === "beyond" ? spec?.beyondNode ?? this.beyondBattleNode : null;
    if (this.mode === "beyond" && this.beyondRun) this.player.hp = Math.min(this.player.stats.maxHp, this.beyondRun.hp ?? this.player.hp);
    this.dodgeDifficulty = this.mode === "dodge" ? getDodgeDifficulty(spec?.dodgeDifficulty) : null;
    this.skillSystem = new SkillSystem(this.mode === "dodge" ? [] : loadout);
    this.tutorialMode = Boolean(spec?.tutorial || this.mode === "tutorial");
    this.tutorialHasMoved = false;
    this.tutorialHasUsedSkill = false;
    this.tutorialScoreGoal = this.tutorialMode ? 800 : 0;
    this.levelNumber = Number(spec?.level ?? 1);
    this.levelConfig = this.mode === "levels" ? getLevelConfig(this.levelNumber) : this.mode === "beyond" && this.beyondConfig ? { number: this.beyondConfig.level, targetScore: this.beyondConfig.targetScore, boss: this.beyondConfig.boss, spawnInterval: this.beyondConfig.spawnInterval, minimumSpawnInterval: this.beyondConfig.minimumSpawnInterval, speedMultiplier: this.beyondConfig.speedMultiplier, hpMultiplier: this.beyondConfig.hpMultiplier, damageMultiplier: this.beyondConfig.damageMultiplier } : null;
    const spawnerConfig = this.levelConfig
      ? { fixed: true, spawnInterval: this.levelConfig.spawnInterval, minimumSpawnInterval: this.levelConfig.minimumSpawnInterval, speedMultiplier: this.levelConfig.speedMultiplier, hpMultiplier: this.levelConfig.hpMultiplier }
      : { ...LEVEL_CONFIG.difficulty, hpMultiplierStep: LEVEL_CONFIG.difficulty.hpMultiplierStep ?? 0.06 };
    this.spawner = this.mode === "dodge" ? null : new EnemySpawner({ width: this.bounds.width, config: spawnerConfig, pool: this.levelConfig?.enemyPool });
    this.enemies = [];
    this.projectiles = [];
    this.explosions = [];
    this.lasers = [];
    this.decoys = [];
    const wolfpack = hasActiveSynergy(loadout, "synergy-wolfpack");
    this.wingman = this.mode === "dodge" ? null : (loadout.modules.some(({ module }) => module?.id === "special-wingman") ? new Wingman(this.player, { wolfpack }) : null);
    this.freezeTimer = 0;
    this.polarityWindow = 0;
    this.whiteHoleActive = hasActiveSynergy(loadout, "synergy-white-hole");
    this.whiteHoleHealing = null;
    this.ionSaw = { active: false, damage: 1, damageTimer: 0 };
    this.sonicWaves = [];
    this.damageNumbers = [];
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeStrength = 0;
    this.elapsed = 0;
    this.score = 0;
    this.bossSpawned = false;
    this.boss = null;
    this.bossSummonTimer = 0;
    this.bossSummonCount = 0;
    this.environment = null;
    this.dodgePatternTimer = this.mode === "dodge" ? 0.7 : Infinity;
    this.dodgePatternIndex = 0;
    this.dodgePatternHistory = -1;
    this.dodgeBulletsDodged = 0;
    this.countdownRemaining = this.countdownEnabled ? 3 : 0;
    this.environmentTimer = this.levelConfig?.environment?.firstDelay ?? Infinity;
    this.environmentPool = this.levelConfig?.environmentPool ?? [];
    this.state = this.countdownEnabled ? "countdown" : "playing";
    this.beyondPauseSaveButton?.classList.toggle("is-hidden", this.mode !== "beyond");
    if (this.beyondPauseSaveButton) this.beyondPauseSaveButton.hidden = this.mode !== "beyond";
    this.ui.showPlaying({ hp: this.player.hp, maxHp: this.player.stats.maxHp, score: 0, elapsed: 0, attackSpeed: getPlayerAttackSpeed(this.player), skills: this.skillSystem.getState(), level: this.levelConfig?.number ?? null, goal: this.levelConfig?.targetScore ?? null, boss: false, tutorial: this.tutorialMode, modeLabel: this.tutorialMode ? "教程 / 800分" : this.mode === "beyond" ? "光锥之外" : this.dodgeDifficulty ? `躲避 · ${this.dodgeDifficulty.name}` : null });
    this.ui.updateCountdown(this.countdownRemaining);
    this.lastFrame = performance.now();
    this.animationFrame = requestAnimationFrame((time) => this.frame(time));
    } catch (error) {
      this.handleCombatError(error, "战斗初始化");
    }
  }

  stopLoop() { if (this.animationFrame) cancelAnimationFrame(this.animationFrame); this.animationFrame = null; }

  armAudioInteraction() {
    if (this.audioInteractionArmed || typeof document === "undefined") return;
    this.audioInteractionArmed = true;
    const unlock = () => {
      this.audioInteractionArmed = false;
      document.removeEventListener("pointerup", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      this.sound.startMusic();
    };
    document.addEventListener("pointerup", unlock, true);
    document.addEventListener("keydown", unlock, true);
  }

  toMenu() { this.stopLoop(); this.armAudioInteraction(); this.beyondPauseSaveButton?.classList.add("is-hidden"); if (this.beyondPauseSaveButton) this.beyondPauseSaveButton.hidden = true; this.state = "menu"; this.ui.showMenu(); this.render(); }
  toLevelSelect() { this.stopLoop(); this.armAudioInteraction(); this.state = "menu"; this.ui.showLevelSelect(); this.render(); }
  toModeSelect() { this.stopLoop(); this.armAudioInteraction(); this.state = "menu"; this.ui.showModeSelect(); this.render(); }
  exitTutorialBattle() { if (!this.tutorialMode) return; if (!this.tutorialHasMoved) { this.ui.showTutorialBattleHint("请先用 WASD / 方向键，或手指拖动飞机移动一次。", false); return; } if (!this.tutorialHasUsedSkill) { this.ui.showTutorialBattleHint("请点击左下角的主动技能按钮，或按数字键释放一次技能。", false); return; } if (this.score < this.tutorialScoreGoal) { this.ui.showTutorialBattleHint(`继续消灭敌机，达到 ${this.tutorialScoreGoal} 分后自动进入下一步（当前 ${Math.floor(this.score)} 分）。`, false); return; } this.stopLoop(); this.state = "menu"; this.ui.completeTutorialAction(1); this.ui.showTutorial(2, false); this.render(); }
  pause() { if (this.state !== "playing") return false; this.state = "paused"; this.stopLoop(); this.ui.showPause(); return true; }
  resume() { if (this.state !== "paused") return false; this.state = "playing"; this.sound.resumeMusic(); this.ui.hidePause(); this.lastFrame = performance.now(); this.animationFrame = requestAnimationFrame((time) => this.frame(time)); return true; }
  pauseForEnvironment() { if (this.state !== "playing") return false; this.state = "paused"; this.stopLoop(); return true; }
  resumeFromEnvironment() { if (this.state !== "paused") return false; this.state = "playing"; this.sound.resumeMusic(); this.lastFrame = performance.now(); this.animationFrame = requestAnimationFrame((time) => this.frame(time)); return true; }
  triggerShake(kind = "hit") {
    const impact = IMPACT_CONFIG[kind] ?? IMPACT_CONFIG.hit;
    this.shakeTime = Math.max(this.shakeTime, impact.duration);
    this.shakeDuration = Math.max(this.shakeDuration, impact.duration);
    this.shakeStrength = Math.max(this.shakeStrength, impact.strength);
    if (this.vibrationEnabled && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(impact.vibration);
  }

  activateSkill(index) { const activated = this.skillSystem?.activate(index, this); if (activated) { this.sound.play("skill"); if (this.tutorialMode) { this.tutorialHasUsedSkill = true; this.exitTutorialBattle(); } } return activated; }
  startOverclock(duration) { this.player.overclockTimer = duration; }
  markPolarityProjectile(projectile) { if (!projectile || projectile.team !== "enemy" || projectile.polarityDelay > 0 || projectile.kind === "blackHole") return; projectile.polarityDelay = 0.25; projectile.vx = 0; projectile.vy = 0; projectile.polarityColor = "#9d7bff"; }
  convertPolarityProjectile(projectile) {
    if (!projectile || projectile.polarityDelay > 0) return;
    projectile.team = "player";
    projectile.kind = projectile.whiteHoleCandidate ? "whiteHoleBolt" : "polarityBolt";
    projectile.color = projectile.whiteHoleCandidate ? "#f4e9ff" : (projectile.polarityColor ?? "#9d7bff");
    projectile.vx = 0; projectile.vy = -Math.max(220, GAME_CONFIG.projectile.enemySpeed * 1.15);
    projectile.pierce = Boolean(projectile.whiteHoleCandidate);
    projectile.life = Math.max(projectile.whiteHoleCandidate ? 8 : 3, projectile.life);
    if (projectile.whiteHoleCandidate) { projectile.homingPlayer = true; projectile.playerTarget = this.player; projectile.homingTurnRate = 5.5; projectile.whiteHoleHealState = this.whiteHoleHealing; }
  }
  startPolarityReverse(duration) {
    this.polarityWindow = Math.max(this.polarityWindow, duration);
    this.whiteHoleHealing = this.whiteHoleActive ? { remaining: 30 } : null;
    for (const projectile of this.projectiles) {
      if (this.whiteHoleActive && projectile.blackHoleCapturedBy) {
        const hole = projectile.blackHoleCapturedBy; hole.blackHole?.capturedProjectiles?.delete(projectile);
        projectile.blackHoleCapturedBy = null; projectile.blackHoleOrbit = null; projectile.whiteHoleCandidate = true;
      }
      this.markPolarityProjectile(projectile);
    }
  }
  applyBlackHolePull(dt) {
    const holes = this.projectiles.filter((projectile) => projectile.kind === "blackHole" && projectile.life > 0);
    for (const hole of holes) {
      const field = hole.blackHole ?? {};
      const baseRadius = field.pullRadius ?? 66;
      const radius = field.enemyCaptured ? baseRadius * 1.75 : baseRadius;
      const strength = field.pullStrength ?? 105;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        const dx = hole.x - enemy.x; const dy = hole.y - enemy.y; const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < radius) {
          field.slowed = true;
          if (!field.enemyCaptured) {
            field.enemyCaptured = true;
            field.detonationTimer = field.detonationDelay ?? 1;
          }
          const force = strength * (1 - distance / radius); enemy.x += dx / distance * force * dt; enemy.y += dy / distance * force * dt;
        }
      }
      if (field.enemyCaptured && !field.exploded) {
        field.detonationTimer = Math.max(0, (field.detonationTimer ?? 1) - dt);
        if (field.detonationTimer <= 0) hole.life = 0;
      }
      for (const projectile of this.projectiles) {
        if (projectile === hole || projectile.team !== "enemy" || projectile.polarityDelay > 0 || (projectile.blackHoleCapturedBy && projectile.blackHoleCapturedBy !== hole)) continue;
        const dx = hole.x - projectile.x; const dy = hole.y - projectile.y; const distance = Math.hypot(dx, dy);
        if (projectile.blackHoleCapturedBy === hole) continue;
        if (distance > 0 && distance < radius) {
          projectile.blackHoleCapturedBy = hole;
          projectile.blackHoleOrbit = { radius: Math.max(8, radius * (0.22 + Math.random() * 0.58)), angle: Math.random() * Math.PI * 2, speed: (1.8 + Math.random() * 2.4) * (Math.random() < 0.5 ? -1 : 1) };
          field.capturedProjectiles ??= new Set(); field.capturedProjectiles.add(projectile);
          projectile.vx = 0; projectile.vy = 0;
        }
      }
    }
  }
  createDecoy(duration) { this.decoys.push(new Decoy(this.player, duration)); }
  startIonSaw(duration) { this.ionSaw.active = true; this.ionSaw.duration = Math.max(this.ionSaw.duration ?? 0, duration); this.ionSaw.damageTimer = 0; }
  startSonicWave(duration) { this.sonicWaves.push({ duration, spawnTimer: 0, nextY: this.player.y, step: SONIC_WAVE_CONFIG.spawnStep }); }

  createDodgeBullet({ x, y, vx = 0, vy = 120, radius = 7, kind = "dodgeOrb", color = "#ff7fd1", damage = this.dodgeDifficulty.damage, life = 8, dodgeMotion = null, dodgeSplit = null }) {
    const projectile = new Projectile({ x, y, vx, vy, damage, radius, color, life, team: "enemy", kind, dodgeMotion });
    projectile.dodgeBullet = true;
    projectile.dodgeSplit = dodgeSplit;
    return projectile;
  }

  spawnDodgePattern() {
    const difficulty = this.dodgeDifficulty;
    if (!difficulty) return;
    const count = difficulty.bulletCount;
    const speed = difficulty.speed * (1 + Math.min(0.65, this.elapsed / 135)) * (0.92 + Math.random() * 0.16);
    const patterns = difficulty.patternPool ?? [0, 1, 2, 3, 4];
    let pattern = this.dodgePatternIndex < patterns.length ? patterns[this.dodgePatternIndex] : patterns[Math.floor(Math.random() * patterns.length)];
    if (patterns.length > 1 && pattern === this.dodgePatternHistory) {
      const alternatives = patterns.filter((entry) => entry !== pattern);
      pattern = alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    this.dodgePatternIndex += 1;
    this.dodgePatternHistory = pattern;
    const splitChance = difficulty.splitChance ?? 0;
    if (pattern === 0) {
      for (let index = 0; index < count; index += 1) {
        this.projectiles.push(this.createDodgeBullet({ x: 28 + Math.random() * (this.bounds.width - 56), y: -18 - index * 20, vy: speed, radius: 7, kind: "dodgeOrb", color: index % 2 ? "#ff80d8" : "#e790ff", dodgeSplit: Math.random() < splitChance * 0.35 ? { delay: 1.2, count: 3, spread: 0.62, speed: speed * 1.08 } : null }));
      }
    } else if (pattern === 1) {
      const amount = 5 + count;
      for (let index = 0; index < amount; index += 1) {
        const angle = ((index / (amount - 1)) - 0.5) * 1.25;
        this.projectiles.push(this.createDodgeBullet({ x: this.bounds.width / 2, y: -18, vx: Math.sin(angle) * speed, vy: Math.cos(angle) * speed, radius: 6, kind: "dodgeShard", color: "#a78bff" }));
      }
    } else if (pattern === 2) {
      const fromLeft = this.dodgePatternIndex % 2 === 0;
      const amount = 2 + count;
      for (let index = 0; index < amount; index += 1) {
        this.projectiles.push(this.createDodgeBullet({ x: fromLeft ? -18 : this.bounds.width + 18, y: 100 + Math.random() * 390, vx: (fromLeft ? 1 : -1) * speed, vy: (Math.random() - 0.5) * 35, radius: 8, kind: "dodgeLine", color: "#65e7ff", life: 7 }));
      }
    } else if (pattern === 3) {
      const amount = 7 + count * 2;
      for (let index = 0; index < amount; index += 1) {
        const angle = (index / amount) * Math.PI * 2 + this.elapsed * 0.55;
        this.projectiles.push(this.createDodgeBullet({ x: this.bounds.width / 2, y: 235, vx: Math.cos(angle) * speed * 0.74, vy: Math.sin(angle) * speed * 0.74, radius: 6, kind: "dodgeRing", color: "#ffd36e", life: 7 }));
      }
    } else if (pattern === 4) {
      const amount = 4 + count;
      for (let index = 0; index < amount; index += 1) {
        const x = 30 + (index / Math.max(1, amount - 1)) * (this.bounds.width - 60);
        this.projectiles.push(this.createDodgeBullet({ x, y: -20 - index * 28, vy: speed * 0.86, radius: 6, kind: "dodgeWave", color: index % 2 ? "#ff9b68" : "#ffd36e", dodgeMotion: { type: "sine", amplitude: 34 + count * 5, frequency: 1.4 + index * 0.07, phase: index * 0.8 } }));
      }
    } else if (pattern === 5) {
      const amount = 3 + count;
      for (let index = 0; index < amount; index += 1) {
        this.projectiles.push(this.createDodgeBullet({ x: 34 + Math.random() * (this.bounds.width - 68), y: -24 - Math.random() * 130, vy: speed * (0.42 + Math.random() * 0.16), radius: 9 + count * 0.5, kind: "dodgeMine", color: index % 2 ? "#70f4dc" : "#72d9ff", life: 9, dodgeMotion: { type: "curve", steer: 70 + count * 12, frequency: 1.2 + Math.random() * 0.7, phase: Math.random() * Math.PI * 2, maxSpeed: speed * 0.75 } }));
      }
    } else if (pattern === 6) {
      const centerX = this.bounds.width * (0.35 + Math.random() * 0.3);
      const centerY = 170 + Math.random() * 150;
      const orbitRadius = 34 + Math.random() * 28;
      const amount = 4 + count * 2;
      for (let index = 0; index < amount; index += 1) {
        const angle = (index / amount) * Math.PI * 2;
        this.projectiles.push(this.createDodgeBullet({ x: centerX + Math.cos(angle) * orbitRadius, y: centerY + Math.sin(angle) * orbitRadius, vx: Math.cos(angle) * speed * 0.35, vy: Math.sin(angle) * speed * 0.35, radius: 6, kind: "dodgeSpiral", color: index % 2 ? "#b38cff" : "#ff87d7", life: 7.5, dodgeMotion: { type: "orbit", centerX, centerY, radius: orbitRadius, angle, angularSpeed: (0.8 + Math.random() * 0.7) * (index % 2 ? 1 : -1) } }));
      }
    } else if (pattern === 7) {
      const amount = 1 + Math.min(2, count);
      for (let index = 0; index < amount; index += 1) {
        this.projectiles.push(this.createDodgeBullet({ x: 44 + Math.random() * (this.bounds.width - 88), y: -28 - index * 56, vy: speed * 0.58, radius: 11, kind: "dodgeSplit", color: "#ff76b8", life: 9, dodgeSplit: { delay: 0.85 + Math.random() * 0.45, count: 3 + count, spread: 0.78, speed: speed * (0.88 + Math.random() * 0.18) } }));
      }
    } else if (pattern === 8) {
      const amount = 3 + count;
      for (let index = 0; index < amount; index += 1) {
        const fromLeft = index % 2 === 0;
        this.projectiles.push(this.createDodgeBullet({ x: fromLeft ? -24 : this.bounds.width + 24, y: 120 + (index / Math.max(1, amount - 1)) * 430, vx: (fromLeft ? 1 : -1) * speed * 0.68, vy: (index % 3 - 1) * speed * 0.46, radius: 6, kind: "dodgeCross", color: fromLeft ? "#67e6ff" : "#b18cff", life: 8, dodgeMotion: { type: "curve", steer: 46, frequency: 1.6, phase: index * 0.8, maxSpeed: speed * 0.92 } }));
      }
    } else if (pattern === 9) {
      const lanes = 7 + count * 2;
      const gap = Math.floor(Math.random() * lanes);
      for (let lane = 0; lane < lanes; lane += 1) {
        if (lane === gap || (lane === gap - 1 && Math.random() < 0.35)) continue;
        this.projectiles.push(this.createDodgeBullet({ x: (lane + 0.5) * this.bounds.width / lanes, y: -22 - Math.random() * 35, vy: speed * 0.66, radius: 5.5, kind: "dodgeWall", color: "#ff9fca", life: 9, dodgeMotion: { type: "sine", amplitude: 8 + count * 2, frequency: 1.1, phase: lane * 0.4 } }));
      }
    } else if (pattern === 10) {
      // 低空突发：弹幕直接在屏幕下半区出现，向上穿过玩家航线。
      const amount = 2 + count * 2;
      for (let index = 0; index < amount; index += 1) {
        this.projectiles.push(this.createDodgeBullet({
          x: 28 + Math.random() * (this.bounds.width - 56),
          y: this.bounds.height * (0.56 + Math.random() * 0.34),
          vx: (Math.random() - 0.5) * speed * 0.28,
          vy: -speed * (0.48 + Math.random() * 0.22),
          radius: 7,
          kind: "dodgeOrb",
          color: index % 2 ? "#6de8ff" : "#b28cff",
          life: 7,
          dodgeMotion: { type: "curve", steer: 42 + count * 8, frequency: 1.25 + Math.random() * 0.6, phase: Math.random() * Math.PI * 2, maxSpeed: speed * 0.72 },
        }));
      }
    } else if (pattern === 11) {
      // 反向扇面：从屏幕底边向上展开，避免所有危险都只从上方进入。
      const amount = 4 + count * 2;
      const centerX = this.bounds.width / 2;
      for (let index = 0; index < amount; index += 1) {
        const angle = ((index / Math.max(1, amount - 1)) - 0.5) * 1.02;
        this.projectiles.push(this.createDodgeBullet({
          x: centerX + (index - (amount - 1) / 2) * 14,
          y: this.bounds.height + 22 + Math.random() * 24,
          vx: Math.sin(angle) * speed * 0.72,
          vy: -Math.cos(angle) * speed * 0.72,
          radius: 6,
          kind: "dodgeShard",
          color: index % 2 ? "#ff79cf" : "#8ee8ff",
          life: 8,
        }));
      }
    }
  }

  updateDodgeMode(dt) {
    const difficulty = this.dodgeDifficulty;
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.player.update(dt, this.input, this.bounds);
    this.dodgePatternTimer -= dt;
    if (this.dodgePatternTimer <= 0) {
      this.spawnDodgePattern();
      this.dodgePatternTimer = Math.max(0.28, difficulty.spawnInterval * (1 - Math.min(0.3, this.elapsed / 180)));
    }
    const spawnedDodgeBullets = [];
    for (const projectile of this.projectiles) {
      projectile.update(dt, [], this.bounds);
      const split = projectile.dodgeSplit;
      if (!split || split.done || projectile.age < split.delay) continue;
      split.done = true;
      const baseAngle = Math.atan2(projectile.vy, projectile.vx);
      const amount = Math.max(2, split.count ?? 3);
      for (let index = 0; index < amount; index += 1) {
        const ratio = amount === 1 ? 0 : (index / (amount - 1)) - 0.5;
        const angle = baseAngle + ratio * (split.spread ?? 0.7);
        const childSpeed = split.speed ?? Math.max(120, Math.hypot(projectile.vx, projectile.vy));
        spawnedDodgeBullets.push(this.createDodgeBullet({ x: projectile.x, y: projectile.y, vx: Math.cos(angle) * childSpeed, vy: Math.sin(angle) * childSpeed, radius: Math.max(4, projectile.radius * 0.62), kind: "dodgeShard", color: projectile.color, life: 6.5 }));
      }
      projectile.active = false;
      projectile.life = 0;
    }
    this.projectiles.push(...spawnedDodgeBullets);
    const collision = this.collisionSystem.resolve({ player: this.player, enemies: [], projectiles: this.projectiles });
    let dodged = 0;
    this.projectiles = this.projectiles.filter((projectile) => {
      if (collision.removedProjectiles.has(projectile)) return false;
      if (projectile.isOffscreen(this.bounds.width, this.bounds.height)) { if (projectile.dodgeBullet) dodged += 1; return false; }
      return true;
    });
    this.dodgeBulletsDodged += dodged;
    this.score += difficulty.scorePerSecond * dt + dodged * difficulty.scorePerBullet;
    if (collision.playerDamage > 0) { const canTakeDamage = this.player.invulnerabilityTimer <= 0; if (canTakeDamage) { this.triggerShake("damage"); this.sound.play("playerHit"); } if (this.player.damage(collision.playerDamage)) { this.endGame(); return; } }
    this.updateDamageNumbers(dt);
    this.stars.forEach((star) => { star.y += star.speed * dt; if (star.y > this.bounds.height) star.y = -4; });
    this.ui.updateHud({ hp: this.player.hp, maxHp: this.player.stats.maxHp, score: this.score, elapsed: this.elapsed, attackSpeed: getPlayerAttackSpeed(this.player), modeLabel: `躲避 · ${difficulty.name}` });
  }

  updateEnvironment(dt) {
    if (!this.levelConfig?.environment) return;
    if (this.environment) {
      this.environment.remaining -= dt;
      if (this.environment.remaining <= 0) {
        this.environment = null;
        this.environmentTimer = this.levelConfig.environment.interval;
      }
      return;
    }
    this.environmentTimer -= dt;
    if (this.environmentTimer > 0) return;
    const pool = this.environmentPool.length ? this.environmentPool : getEnvironmentPool(this.levelNumber);
    const definition = pool[Math.floor(Math.random() * pool.length)];
    if (!definition) return;
    this.environment = { definition, remaining: definition.duration };
  }

  environmentEffects() {
    const active = this.environment?.definition;
    return { player: active?.player ?? {}, enemy: active?.enemy ?? {} };
  }

  updateBossSummons(dt) {
    const summon = this.boss?.definition?.summon;
    if (!summon) return [];
    this.bossSummonTimer -= dt;
    if (this.bossSummonTimer > 0) return [];
    const activeMinions = this.enemies.filter((enemy) => !enemy.boss && enemy.hp > 0).length;
    const availableSlots = Math.max(0, summon.maxActive - activeMinions);
    if (availableSlots === 0) { this.bossSummonTimer = 0.65; return []; }
    this.bossSummonTimer = summon.interval;
    const amount = Math.min(summon.count, availableSlots);
    const spawned = [];
    for (let index = 0; index < amount; index += 1) {
      const enemyId = summon.pool[(this.bossSummonCount + index) % summon.pool.length];
      const definition = getEnemyById(enemyId);
      if (!definition) continue;
      const side = index % 2 === 0 ? -1 : 1;
      const x = Math.max(definition.radius + 4, Math.min(this.bounds.width - definition.radius - 4, this.boss.x + side * (58 + index * 16)));
      spawned.push(new Enemy(definition, x, { level: this.levelNumber, spawnY: this.boss.y + 10 + index * 8, summoned: true, hpMultiplier: this.levelConfig?.hpMultiplier ?? 1, speedMultiplier: this.levelConfig?.speedMultiplier ?? 1, damageMultiplier: this.levelConfig?.damageMultiplier ?? 1 }));
    }
    this.bossSummonCount += spawned.length;
    return spawned;
  }

  frame(time) {
    if (this.state !== "playing" && this.state !== "countdown") return;
    try {
      const dt = Math.min(0.034, Math.max(0.001, (time - this.lastFrame) / 1000));
      this.lastFrame = time;
      if (this.state === "countdown") {
        this.countdownRemaining = Math.max(0, this.countdownRemaining - dt);
        this.ui.updateCountdown(this.countdownRemaining);
        this.render();
        if (this.countdownRemaining <= 0) {
          this.state = "playing";
          this.lastFrame = time;
          this.ui.updateCountdown(0);
        }
        this.animationFrame = requestAnimationFrame((next) => this.frame(next));
        return;
      }
      this.update(dt);
      this.render();
      if (this.state === "playing") this.animationFrame = requestAnimationFrame((next) => this.frame(next));
    } catch (error) {
      this.handleCombatError(error, "战斗运行");
    }
  }

  updateSonicWave(dt) {
    const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
    const topBoundary = -SONIC_WAVE_CONFIG.beamThickness;

    for (const wave of this.sonicWaves) {
      wave.spawnTimer -= safeDt;
      while (wave.spawnTimer <= 0 && Number.isFinite(wave.nextY) && wave.nextY > topBoundary) {
        this.lasers.push({
          y: wave.nextY,
          life: SONIC_WAVE_CONFIG.beamLife,
          visualLife: SONIC_WAVE_CONFIG.beamVisualLife,
          age: 0,
          thickness: SONIC_WAVE_CONFIG.beamThickness,
          damage: SONIC_WAVE_CONFIG.damage,
          hitIds: new Set(),
        });
        wave.nextY -= wave.step;
        wave.spawnTimer += SONIC_WAVE_CONFIG.spawnInterval;
      }
      // Mark the sequence finished as soon as its next beam would be above the canvas.
      wave.finished = !Number.isFinite(wave.nextY) || wave.nextY <= topBoundary;
    }
    this.sonicWaves = this.sonicWaves.filter((wave) => !wave.finished);

    // Keep damage and visual lifetimes separate: the beam can leave a short afterglow
    // without causing a second hit, while invalid top-edge beams are still removed.
    for (const laser of this.lasers) {
      laser.age += safeDt;
      laser.life = Math.max(0, laser.life - safeDt);
      laser.visualLife = Math.max(0, laser.visualLife - safeDt);
    }
    this.lasers = this.lasers.filter((laser) => Number.isFinite(laser.visualLife) && laser.visualLife > 0);
  }

  updateDamageNumbers(dt) { for (const number of this.damageNumbers) { number.age += dt; number.y -= 22 * dt; } this.damageNumbers = this.damageNumbers.filter((number) => number.age < number.life); }
  updateExplosions(dt) { for (const explosion of this.explosions) explosion.life -= dt; this.explosions = this.explosions.filter((explosion) => explosion.life > 0); }

  update(dt) {
    this.elapsed += dt;
    if (this.mode === "dodge") { this.updateDodgeMode(dt); return; }
    this.updateEnvironment(dt);
    const environmentEffects = this.environmentEffects();
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.skillSystem.update(dt);
    this.polarityWindow = Math.max(0, this.polarityWindow - dt);
    this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    this.ionSaw.duration = Math.max(0, (this.ionSaw.duration ?? 0) - dt);
    this.ionSaw.active = this.ionSaw.duration > 0;
    this.ionSaw.damageTimer -= dt;
    this.updateSonicWave(dt);
    this.player.environmentAttackSpeedMultiplier = environmentEffects.player.attackSpeed ?? 1;
    const wasOverclocked = this.player.overclockTimer > 0;
    const previousPlayerPosition = { x: this.player.x, y: this.player.y };
    this.player.update(dt, this.input, this.bounds, environmentEffects.player.moveSpeed ?? 1);
    if (this.tutorialMode && !this.tutorialHasMoved && Math.hypot(this.player.x - previousPlayerPosition.x, this.player.y - previousPlayerPosition.y) > 2) {
      this.tutorialHasMoved = true;
      this.exitTutorialBattle();
    }
    if (wasOverclocked && this.player.overclockTimer <= 0) this.player.weaponSilenceTimer = Math.max(this.player.weaponSilenceTimer, 1);
    const playerShots = this.weaponSystem.firePlayer(this.player, this.enemies);
    if (playerShots.some((projectile) => projectile.kind === "ball")) this.sound.play("ballLightning");
    if (playerShots.some((projectile) => projectile.kind !== "ball")) this.sound.play("shot");
    if (playerShots.some((projectile) => projectile.kind === "chainLightning")) this.sound.play("lightning");
    this.projectiles.push(...playerShots);
    for (const decoy of this.decoys) { decoy.update(dt); if (decoy.alive) this.projectiles.push(...this.weaponSystem.firePlayer(decoy, this.enemies, { damageMultiplier: decoy.damageMultiplier })); }
    this.decoys = this.decoys.filter((decoy) => decoy.alive);
    if (this.wingman) {
      this.wingman.update(dt, this.player, this.bounds);
      const shot = this.wingman.fire();
      if (shot) this.projectiles.push(shot);
      const nestShots = this.weaponSystem.fireWingmanNest(this.wingman, this.enemies);
      if (nestShots.length) { this.projectiles.push(...nestShots); this.sound.play("shot"); }
    }

    if (this.levelConfig?.boss && !this.bossSpawned && this.score >= this.levelConfig.targetScore) {
      this.bossSpawned = true;
      this.boss = new Enemy(createBossDefinition(this.levelNumber), this.bounds.width / 2, { level: this.levelNumber, hpMultiplier: this.levelConfig?.hpMultiplier ?? 1, speedMultiplier: this.levelConfig?.speedMultiplier ?? 1, damageMultiplier: this.levelConfig?.damageMultiplier ?? 1 });
      this.enemies = [this.boss];
      this.bossSummonTimer = 1.2;
      this.bossSummonCount = 0;
    } else if (!this.bossSpawned) {
      const enemy = this.spawner.update(dt, this.elapsed);
      if (enemy) this.enemies.push(enemy);
    }
    if (this.bossSpawned && this.boss && this.boss.hp > 0) this.enemies.push(...this.updateBossSummons(dt));
    const statusDamageEvents = [];
    for (const current of this.enemies) {
      current.frozen = this.freezeTimer > 0 && !current.definition.boss;
      current.environmentSpeedMultiplier = environmentEffects.enemy.speed ?? 1;
      current.environmentShootIntervalMultiplier = environmentEffects.enemy.shootInterval ?? 1;
      current.environmentProjectileSpeedMultiplier = environmentEffects.enemy.projectileSpeed ?? 1;
      statusDamageEvents.push(...(current.updateBurn?.(dt) ?? []));
      current.update(dt, this.bounds);
      if (current.canShoot()) {
        const shots = this.weaponSystem.fireEnemy(current, this.player);
        this.projectiles.push(...(Array.isArray(shots) ? shots : [shots]));
      }
    }
    if (this.polarityWindow > 0) for (const projectile of this.projectiles) this.markPolarityProjectile(projectile);
    this.applyBlackHolePull(dt);
    for (const projectile of this.projectiles) {
      if (projectile.polarityDelay > 0) { projectile.polarityDelay = Math.max(0, projectile.polarityDelay - dt); if (projectile.polarityDelay > 0) continue; this.convertPolarityProjectile(projectile); }
      if (this.freezeTimer > 0 && projectile.team === "enemy") continue;
      projectile.update(dt, this.enemies, this.bounds);
    }

    const collision = this.collisionSystem.resolve({ player: this.player, enemies: this.enemies, projectiles: this.projectiles, wingman: this.wingman, lasers: this.lasers, freezeActive: this.freezeTimer > 0, ionSaw: this.ionSaw, statusDamageEvents });
    if (collision.sawTriggered) this.ionSaw.damageTimer = 1 / 6;
    this.score += collision.score;
    if (collision.playerHealing > 0) this.player.hp = Math.min(this.player.stats.maxHp, this.player.hp + collision.playerHealing);
    if (this.tutorialMode && this.tutorialHasMoved && this.tutorialHasUsedSkill && this.score >= this.tutorialScoreGoal) { this.exitTutorialBattle(); return; }
    this.explosions.push(...(collision.explosionEvents ?? []));
    if ((collision.damageEvents?.length ?? 0) > 0) { this.triggerShake("hit"); this.sound.play("playerImpact"); }
    if ((collision.explosionEvents ?? []).some((explosion) => explosion.kind === "blackHole")) { this.triggerShake("hit"); this.sound.play("blackHoleExplosion"); }
    if (this.damageNumbersEnabled) for (const event of collision.damageEvents ?? []) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 10;
      this.damageNumbers.push({ x: event.x + Math.cos(angle) * radius, y: event.y + Math.sin(angle) * radius, amount: event.amount, element: event.element ?? "neutral", age: 0, life: 0.65 });
    }
    const bossDefeated = this.boss && collision.destroyedEnemies.has(this.boss);
    this.enemies = this.enemies.filter((current) => !collision.destroyedEnemies.has(current) && (current.boss || current.y < this.bounds.height + 80));
    this.projectiles = this.projectiles.filter((projectile) => !collision.removedProjectiles.has(projectile) && !projectile.isOffscreen(this.bounds.width, this.bounds.height));
    let playerDied = false;
    if (collision.playerDamage > 0) { const canTakeDamage = this.player.invulnerabilityTimer <= 0; if (canTakeDamage) { this.triggerShake("damage"); this.sound.play("playerHit"); } playerDied = this.player.damage(collision.playerDamage); }
    // Apply projectile/weapon enemy removals before ending the run. Contact
    // collisions intentionally leave the enemy on screen.
    if (playerDied) { if (this.tutorialMode) this.exitTutorialBattle(); else this.endGame(); return; }
    this.updateDamageNumbers(dt);
    this.updateExplosions(dt);
    this.stars.forEach((star) => { star.y += star.speed * dt; if (star.y > this.bounds.height) star.y = -4; });
    if (bossDefeated || (this.levelConfig && !this.levelConfig.boss && this.score >= this.levelConfig.targetScore)) { this.endGame({ victory: true }); return; }
    this.ui.updateHud({ hp: this.player.hp, maxHp: this.player.stats.maxHp, score: this.score, elapsed: this.elapsed, attackSpeed: getPlayerAttackSpeed(this.player), level: this.levelConfig?.number ?? null, goal: this.levelConfig?.targetScore ?? null, boss: Boolean(this.bossSpawned && this.boss), environment: this.environment, modeLabel: this.tutorialMode ? "教程 / 800分" : this.mode === "beyond" ? "光锥之外" : null });
    this.ui.updateSkills(this.skillSystem.getState());
  }

  endGame({ victory = false } = {}) { this.state = "gameover"; this.stopLoop(); if (this.mode === "beyond") { this.finishBeyondBattleWithRewards(victory); return; } this.ui.showGameOver({ score: this.score, elapsed: this.elapsed, victory, level: this.levelNumber, mode: this.mode }); }

  render() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.bounds.height);
    gradient.addColorStop(0, LEVEL_CONFIG.background.top); gradient.addColorStop(1, LEVEL_CONFIG.background.bottom);
    this.ctx.fillStyle = gradient; this.ctx.fillRect(0, 0, this.bounds.width, this.bounds.height);
    this.ctx.save();
    if (this.shakeTime > 0) {
      const intensity = this.shakeStrength * Math.min(1, this.shakeTime / Math.max(0.001, this.shakeDuration));
      this.ctx.translate((Math.random() - 0.5) * intensity * 2, (Math.random() - 0.5) * intensity * 2);
    }
    this.drawGrid();
    for (const star of this.stars) { this.ctx.globalAlpha = star.alpha; this.ctx.fillStyle = "#bceeff"; this.ctx.fillRect(star.x, star.y, star.size, star.size); }
    this.ctx.globalAlpha = 1;
    for (const projectile of this.projectiles) projectile.draw(this.ctx);
    for (const laser of this.lasers) this.drawSonicLaser(laser);
    for (const enemy of this.enemies) enemy.draw(this.ctx);
    this.wingman?.draw(this.ctx);
    for (const decoy of this.decoys) this.player.draw(this.ctx, { x: decoy.x, y: decoy.y, alpha: 0.45, damageMultiplier: decoy.damageMultiplier });
    this.player?.draw(this.ctx);
    this.drawExplosions();
    this.drawDamageNumbers();
    this.drawEnvironment();
    if (this.ionSaw.active) this.drawIonSaw();
    if (this.freezeTimer > 0) { this.ctx.save(); this.ctx.fillStyle = "rgba(150,230,255,.045)"; this.ctx.fillRect(0, 0, this.bounds.width, this.bounds.height); this.ctx.restore(); }
    this.ctx.restore();
  }

  drawIonSaw() {
    this.ctx.save();
    for (const side of [-1, 1]) {
      this.ctx.translate(this.player.x + side * 34, this.player.y);
      this.ctx.rotate(this.elapsed * 14 * side);
      this.ctx.shadowBlur = 20; this.ctx.shadowColor = "#b6f7ff"; this.ctx.strokeStyle = "#b6f7ff"; this.ctx.lineWidth = 4;
      this.ctx.beginPath(); this.ctx.moveTo(-4, -23); this.ctx.lineTo(6, 0); this.ctx.lineTo(-4, 23); this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawEnvironment() {
    if (!this.environment) return;
    const { definition, remaining } = this.environment;
    this.ctx.save();
    this.ctx.globalCompositeOperation = "screen";
    this.ctx.globalAlpha = 0.11 + Math.sin(this.elapsed * 4) * 0.025;
    this.ctx.fillStyle = definition.color;
    this.ctx.fillRect(0, 0, this.bounds.width, this.bounds.height);
    this.ctx.restore();
  }

  drawSonicLaser(laser) {
    const visualRatio = Math.max(0, Math.min(1, laser.visualLife / SONIC_WAVE_CONFIG.beamVisualLife));
    const ageRatio = Math.max(0, Math.min(1, laser.age / SONIC_WAVE_CONFIG.beamFlashDuration));
    const fade = Math.pow(visualRatio, 0.72);
    const flash = 1 - ageRatio;
    const pulse = 1 + Math.sin(this.elapsed * 26 + laser.y * 0.03) * 0.035;
    const y = laser.y;
    const outerWidth = SONIC_WAVE_CONFIG.beamGlowThickness * pulse + flash * 8;
    const beamWidth = laser.thickness * pulse + flash * 2;

    this.ctx.save();
    this.ctx.globalCompositeOperation = "lighter";
    this.ctx.lineCap = "butt";

    // Broad purple atmosphere around the beam.
    this.ctx.globalAlpha = fade * (0.16 + flash * 0.2);
    this.ctx.shadowBlur = 30 + flash * 18;
    this.ctx.shadowColor = "#b83dff";
    this.ctx.strokeStyle = "#a72dff";
    this.ctx.lineWidth = outerWidth;
    this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.bounds.width, y); this.ctx.stroke();

    // A vertical gradient makes the edge glow fade into the dark background.
    const gradient = this.ctx.createLinearGradient(0, y - beamWidth * 1.8, 0, y + beamWidth * 1.8);
    gradient.addColorStop(0, "rgba(151, 43, 255, 0)");
    gradient.addColorStop(0.28, `rgba(206, 78, 255, ${0.58 * fade})`);
    gradient.addColorStop(0.5, `rgba(255, 122, 255, ${0.98 * fade})`);
    gradient.addColorStop(0.72, `rgba(206, 78, 255, ${0.58 * fade})`);
    gradient.addColorStop(1, "rgba(151, 43, 255, 0)");
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 20 + flash * 14;
    this.ctx.shadowColor = "#ed75ff";
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = beamWidth * 2.2;
    this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.bounds.width, y); this.ctx.stroke();

    // Bright white-pink core. The newest beam gets a brief high-energy flash.
    this.ctx.globalAlpha = fade * (0.86 + flash * 0.14);
    this.ctx.shadowBlur = 9 + flash * 12;
    this.ctx.shadowColor = "#fff5ff";
    this.ctx.strokeStyle = "#fff4ff";
    this.ctx.lineWidth = SONIC_WAVE_CONFIG.beamCoreThickness + flash * 1.2;
    this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.bounds.width, y); this.ctx.stroke();

    // A tiny moving sheen keeps the beam alive without changing its hitbox.
    this.ctx.globalAlpha = fade * (0.22 + flash * 0.24);
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([18, 54]);
    this.ctx.lineDashOffset = -(this.elapsed * 260 + laser.y);
    this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.bounds.width, y); this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();
  }

  drawDamageNumbers() {
    if (!this.damageNumbersEnabled) return;
    this.ctx.save(); this.ctx.font = "800 21px system-ui, sans-serif"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle"; this.ctx.shadowBlur = 13; this.ctx.shadowColor = "#8ff5ff"; this.ctx.lineWidth = 2;
    for (const number of this.damageNumbers) { this.ctx.globalAlpha = Math.max(0, 1 - number.age / number.life); this.ctx.fillStyle = ELEMENT_DAMAGE_COLORS[number.element] ?? ELEMENT_DAMAGE_COLORS.neutral; this.ctx.shadowColor = this.ctx.fillStyle; this.ctx.strokeStyle = "rgba(15, 20, 50, .82)"; this.ctx.strokeText(`${Math.round(number.amount)}`, number.x, number.y); this.ctx.fillText(`${Math.round(number.amount)}`, number.x, number.y); }
    this.ctx.restore();
  }

  drawExplosions() {
    for (const explosion of this.explosions) {
      const progress = 1 - explosion.life / explosion.maxLife;
      const fade = Math.max(0, 1 - progress);
      const radius = explosion.radius * (0.28 + progress * 0.72);
      this.ctx.save();
      this.ctx.translate(explosion.x, explosion.y);
      this.ctx.globalCompositeOperation = "lighter";
      if (explosion.kind === "psionic") {
        this.drawPsionicExplosion(radius, fade, progress);
        this.ctx.restore();
        continue;
      }
      if (explosion.kind === "waterShot") {
        this.drawWaterExplosion(radius, fade, progress);
        this.ctx.restore();
        continue;
      }
      if (explosion.kind === "blackHole") {
        this.drawBlackHoleExplosion(radius, fade, progress);
        this.ctx.restore();
        continue;
      }
      if (explosion.kind !== "nestMissile") {
        this.drawGenericExplosion(radius, fade, explosion.color ?? "#8ff5ff");
        this.ctx.restore();
        continue;
      }

      // Nest missiles keep the black/red impact signature.
      this.ctx.globalAlpha = fade * 0.18;
      this.ctx.fillStyle = "#ff173f";
      this.ctx.shadowBlur = 28; this.ctx.shadowColor = "#ff173f";
      this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.globalAlpha = fade * 0.92;
      this.ctx.strokeStyle = "#ff294d"; this.ctx.lineWidth = 3; this.ctx.shadowBlur = 18;
      this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.globalAlpha = fade * 0.7;
      this.ctx.strokeStyle = "#ff9baa"; this.ctx.lineWidth = 1.5;
      this.ctx.beginPath(); this.ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.globalAlpha = fade * 0.86;
      this.ctx.strokeStyle = "#ef294d"; this.ctx.lineWidth = 2;
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4 + this.elapsed * 2.5;
        const inner = radius * 0.72; const outer = radius * (1.08 + (index % 2) * 0.12);
        this.ctx.beginPath(); this.ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner); this.ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); this.ctx.stroke();
      }
      this.ctx.globalAlpha = fade * 0.95; this.ctx.fillStyle = "#080a12"; this.ctx.shadowBlur = 8; this.ctx.shadowColor = "#ff173f";
      this.ctx.beginPath(); this.ctx.arc(0, 0, Math.max(4, radius * 0.22), 0, Math.PI * 2); this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawPsionicExplosion(radius, fade, progress) {
    this.ctx.globalAlpha = fade * 0.2;
    this.ctx.fillStyle = "#39f0b0";
    this.ctx.shadowBlur = 30; this.ctx.shadowColor = "#39f0b0";
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.globalAlpha = fade * 0.9;
    this.ctx.strokeStyle = "#72f1c0"; this.ctx.lineWidth = 3; this.ctx.shadowBlur = 18;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.stroke();
    this.ctx.globalAlpha = fade * 0.8;
    this.ctx.strokeStyle = "#d9fff3"; this.ctx.lineWidth = 1.5;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2); this.ctx.stroke();
    this.ctx.globalAlpha = fade * 0.88;
    this.ctx.strokeStyle = "#72f1c0"; this.ctx.lineWidth = 2;
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3 + this.elapsed * 3.2;
      const inner = radius * 0.5; const outer = radius * (1.08 + (index % 2) * 0.16);
      this.ctx.beginPath(); this.ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner); this.ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); this.ctx.stroke();
    }
    this.ctx.globalAlpha = fade;
    this.ctx.fillStyle = "#f4fffc"; this.ctx.shadowBlur = 12; this.ctx.shadowColor = "#72f1c0";
    this.ctx.beginPath(); this.ctx.arc(0, 0, Math.max(3, radius * (0.18 + progress * 0.08)), 0, Math.PI * 2); this.ctx.fill();
  }

  drawBlackHoleExplosion(radius, fade, progress) {
    this.ctx.globalAlpha = fade * 0.3;
    this.ctx.fillStyle = "#7b3dce"; this.ctx.shadowBlur = 34; this.ctx.shadowColor = "#b57bff";
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.globalAlpha = fade * 0.95;
    this.ctx.strokeStyle = "#d8baff"; this.ctx.lineWidth = 3.5; this.ctx.shadowBlur = 24;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius * (0.48 + progress * 0.52), 0, Math.PI * 2); this.ctx.stroke();
    this.ctx.globalAlpha = fade * 0.8;
    this.ctx.strokeStyle = "#8b4ee4"; this.ctx.lineWidth = 2; this.ctx.shadowBlur = 12;
    for (let index = 0; index < 10; index += 1) {
      const angle = index * Math.PI / 5 + this.elapsed * 3.5;
      const inner = radius * 0.45; const outer = radius * (0.95 + (index % 2) * 0.2);
      this.ctx.beginPath(); this.ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner); this.ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); this.ctx.stroke();
    }
    this.ctx.globalAlpha = fade;
    this.ctx.fillStyle = "#ffffff"; this.ctx.shadowBlur = 18; this.ctx.shadowColor = "#f1ddff";
    this.ctx.beginPath(); this.ctx.arc(0, 0, Math.max(3, radius * (0.2 - progress * 0.08)), 0, Math.PI * 2); this.ctx.fill();
  }

  drawGenericExplosion(radius, fade, color) {
    this.ctx.globalAlpha = fade * 0.16;
    this.ctx.fillStyle = color; this.ctx.shadowBlur = 26; this.ctx.shadowColor = color;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.globalAlpha = fade * 0.85;
    this.ctx.strokeStyle = color; this.ctx.lineWidth = 2.5; this.ctx.shadowBlur = 16;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.stroke();
    this.ctx.globalAlpha = fade * 0.9;
    this.ctx.fillStyle = "#ffffff"; this.ctx.shadowBlur = 8;
    this.ctx.beginPath(); this.ctx.arc(0, 0, Math.max(3, radius * 0.2), 0, Math.PI * 2); this.ctx.fill();
  }

  drawWaterExplosion(radius, fade, progress) {
    this.ctx.globalAlpha = fade * 0.2; this.ctx.fillStyle = "#176dff"; this.ctx.shadowBlur = 24; this.ctx.shadowColor = "#4fd9ff";
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.globalAlpha = fade * 0.9; this.ctx.strokeStyle = "#2388ff"; this.ctx.lineWidth = 2.5; this.ctx.shadowBlur = 14;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius * (0.45 + progress * 0.55), 0, Math.PI * 2); this.ctx.stroke();
    this.ctx.globalAlpha = fade * 0.82; this.ctx.strokeStyle = "#9de7ff"; this.ctx.lineWidth = 1.3;
    for (let index = 0; index < 8; index += 1) { const angle = index * Math.PI / 4 + this.elapsed * 1.8; const inner = radius * 0.25; const outer = radius * (0.8 + (index % 2) * 0.2); this.ctx.beginPath(); this.ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner); this.ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); this.ctx.stroke(); }
    this.ctx.globalAlpha = fade; this.ctx.fillStyle = "#d9f8ff"; this.ctx.shadowBlur = 10; this.ctx.beginPath(); this.ctx.arc(0, 0, Math.max(2, radius * 0.16), 0, Math.PI * 2); this.ctx.fill();
  }

  drawGrid() {
    const columns = 15;
    const rows = 15;
    const horizontalColor = this.ctx.createLinearGradient(0, 0, 0, this.bounds.height);
    horizontalColor.addColorStop(0, "rgba(65, 204, 255, .44)");
    horizontalColor.addColorStop(.52, "rgba(255, 87, 207, .4)");
    horizontalColor.addColorStop(1, "rgba(148, 111, 255, .42)");
    const verticalColor = this.ctx.createLinearGradient(0, 0, this.bounds.width, 0);
    verticalColor.addColorStop(0, "rgba(65, 204, 255, .38)");
    verticalColor.addColorStop(.52, "rgba(255, 87, 207, .36)");
    verticalColor.addColorStop(1, "rgba(148, 111, 255, .38)");
    this.ctx.save();
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = .9;
    for (let row = 0; row <= rows; row += 1) {
      const y = Math.round(row * this.bounds.height / rows) + .5;
      this.ctx.strokeStyle = horizontalColor;
      this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.bounds.width, y); this.ctx.stroke();
    }
    for (let column = 0; column <= columns; column += 1) {
      const x = Math.round(column * this.bounds.width / columns) + .5;
      this.ctx.strokeStyle = verticalColor;
      this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.bounds.height); this.ctx.stroke();
    }
    this.ctx.globalAlpha = .65;
    this.ctx.strokeStyle = "rgba(100, 231, 255, .52)";
    this.ctx.strokeRect(.5, .5, this.bounds.width - 1, this.bounds.height - 1);
    this.ctx.restore();
  }
}
