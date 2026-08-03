import { ASSEMBLY_BOARD, MODULE_CONFIG, createLoadout, getFootprintBounds, getInstalledModules, getModuleById, getModuleElement } from "../config/module-config.js";
import { MAX_SKILL_MODULES, calculateFinalStats, countSkillModules, pruneDisconnected, validateGeometry, validateLoadout } from "../systems/ModuleSystem.js";
import { decodeLoadoutCode, encodeLoadoutCode } from "../systems/LoadoutCodec.js";
import { paintModuleCanvas, setModuleGlowEnabled } from "../rendering/ModuleRenderer.js";
import { LEVELS } from "../config/level-config.js";
import { PLAYER_BASE_STATS } from "../config/game-config.js";
import { getBeyondEventArchiveEntries, getEncyclopediaSections } from "../config/encyclopedia-config.js";
import { DODGE_DIFFICULTIES } from "../config/dodge-config.js";
import { MenuAmbientRenderer } from "./MenuAmbientRenderer.js";
import { AppAmbientRenderer } from "./AppAmbientRenderer.js";
import { MainMenuFlightRenderer } from "./MainMenuFlightRenderer.js";
import { getSynergyStates, normalizeSynergies } from "../config/synergy-config.js";
import { BEYOND_LIGHT_CONE_CONFIG } from "../config/beyond-light-cone-config.js";
import { installBeyondLightConeUI } from "./BeyondLightConeUI.js";

const scoreText = (value) => String(Math.max(0, Math.floor(value))).padStart(6, "0");
const timeText = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const escapeHtml = (value) => String(value).replace(/[&<>\x27"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\x27": "&#39;", '"': "&quot;" }[char]));
const moduleGroups = [["weapon", "\u81ea\u52a8\u6a21\u5757", MODULE_CONFIG.weapons], ["special", "\u6280\u80fd\u6a21\u5757", MODULE_CONFIG.specials]];
const typeLabels = { core: "\u6838\u5fc3\u6a21\u5757", weapon: "\u81ea\u52a8\u6a21\u5757", special: "\u6280\u80fd\u6a21\u5757" };
const rarityLabels = { common: "\u666e\u901a", uncommon: "\u975e\u51e1", rare: "\u7a00\u6709", epic: "\u53f2\u8bd7", legendary: "\u4f20\u8bf4" };
const elementLabels = { neutral: "\u65e0\u5c5e\u6027", electric: "\u7535\u5c5e\u6027", light: "\u5149\u5c5e\u6027", dark: "\u6697\u5c5e\u6027", ice: "\u51b0\u5c5e\u6027", water: "\u6c34\u5c5e\u6027", fire: "\u706b\u5c5e\u6027" };
const tutorialSteps = [
  { tag: "ASSEMBLY", title: "\u62fc\u88c5\u4f60\u7684\u673a\u4f53", body: "\u8fdb\u5165\u6539\u88c5\u673a\u4f53\uff0c\u4ece\u6a21\u5757\u4ed3\u5e93\u62d6\u51fa\u6a21\u5757\u653e\u5230\u6838\u5fc3\u9644\u8fd1\u7684\u7f51\u683c\u3002\u6a21\u5757\u5fc5\u987b\u4e0e\u6838\u5fc3\u76f4\u63a5\u6216\u95f4\u63a5\u76f8\u8fde\uff0c\u5e76\u4e14\u5fc5\u987b\u81f3\u5c11\u88c5\u914d 1 \u4e2a\u81ea\u52a8\u6a21\u5757\u548c 1 \u4e2a\u6280\u80fd\u6a21\u5757\u3002\u4fdd\u5b58\u540e\u5e26\u7740\u5f53\u524d\u673a\u4f53\u51fa\u6218\u3002" },
  { tag: "COMBAT", title: "\u5f00\u59cb\u6218\u6597", body: "\u5148\u8fdb\u5165\u4e00\u5c40\u8bad\u7ec3\u5173\u5361\u719f\u6089\u57fa\u672c\u64cd\u4f5c\u3002\u98de\u673a\u4f1a\u81ea\u52a8\u5f00\u706b\uff0c\u7535\u8111\u7528 WASD \u6216\u65b9\u5411\u952e\u79fb\u52a8\uff0c\u624b\u673a\u7528\u624b\u6307\u62d6\u52a8\u3002\u8eb2\u5f00\u654c\u673a\u548c\u5f39\u5e55\uff0c\u51fb\u843d\u654c\u4eba\u83b7\u5f97\u5206\u6570\u3002" },
  { tag: "READY", title: "\u51fa\u53d1\uff01", body: "\u57fa\u7840\u8bad\u7ec3\u5df2\u5b8c\u6210\u3002\u4f60\u53ef\u4ee5\u8fdb\u5165\u6a21\u5f0f\u9009\u62e9\u5f00\u59cb\u6b63\u5f0f\u6e38\u620f\uff0c\u4e5f\u53ef\u4ee5\u9000\u51fa\u6559\u7a0b\u56de\u5230\u4e3b\u83dc\u5355\uff1b\u66f4\u8be6\u7ec6\u7684\u5185\u5bb9\u53ef\u5728\u6e38\u620f\u767e\u79d1\u548c\u66f4\u65b0\u65e5\u5fd7\u4e2d\u67e5\u770b\u3002" },
];

function paintEncyclopediaEnemy(canvas, enemy) {
  if (!canvas || !enemy) return;
  const ctx = canvas.getContext("2d"); const { type, color } = enemy;
  const size = canvas.width; const center = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.save(); ctx.translate(center, center); ctx.scale(size / 62, size / 62);
  ctx.shadowBlur = 12; ctx.shadowColor = color; ctx.fillStyle = color;
  ctx.beginPath();
  if (type === "guardian") { ctx.moveTo(0, -23); ctx.lineTo(20, -8); ctx.lineTo(16, 17); ctx.lineTo(0, 23); ctx.lineTo(-16, 17); ctx.lineTo(-20, -8); }
  else if (type === "swift") { ctx.moveTo(0, 19); ctx.lineTo(13, -14); ctx.lineTo(3, -9); ctx.lineTo(0, -22); ctx.lineTo(-3, -9); ctx.lineTo(-13, -14); }
  else if (type === "orbit") { ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.strokeStyle = "#b4fff0"; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.moveTo(0, -22); ctx.lineTo(0, 22); ctx.stroke(); }
  else if (type === "phantom") { ctx.moveTo(0, 20); ctx.lineTo(18, -4); ctx.lineTo(8, -18); ctx.lineTo(0, -10); ctx.lineTo(-8, -18); ctx.lineTo(-18, -4); }
  else if (type === "striker") { ctx.moveTo(0, 24); ctx.lineTo(20, -14); ctx.lineTo(7, -10); ctx.lineTo(0, -22); ctx.lineTo(-7, -10); ctx.lineTo(-20, -14); }
  else if (type === "bulwark") { ctx.rect(-21, -19, 42, 38); }
  else if (type === "rammer") { ctx.moveTo(0, 25); ctx.lineTo(18, -18); ctx.lineTo(0, -12); ctx.lineTo(-18, -18); }
  else { ctx.moveTo(0, 20); ctx.lineTo(16, -8); ctx.lineTo(6, -5); ctx.lineTo(0, -18); ctx.lineTo(-6, -5); ctx.lineTo(-16, -8); }
  if (type !== "orbit") { ctx.closePath(); ctx.fill(); }
  ctx.shadowBlur = 3; ctx.fillStyle = "#241b3a"; ctx.beginPath(); ctx.arc(0, 0, type === "guardian" || type === "bulwark" ? 7 : 5, 0, Math.PI * 2); ctx.fill();
  if (type === "bulwark") { ctx.strokeStyle = "#a8d8ff"; ctx.shadowColor = "#78b8ff"; ctx.shadowBlur = 10; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

// Keep the native click (release) as the only button action. If a touch
// changes the screen before the browser emits its delayed click, discard the
// retargeted click instead of activating the button now under the finger.
const installTouchReleaseGuard = () => {
  const activeTouches = new Map();
  let lastTouchRelease = null;
  const getButton = (target) => target instanceof Element ? target.closest("button") : null;
  const remember = (event) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    activeTouches.set(event.pointerId, { button: getButton(event.target) });
  };
  const release = (event) => {
    const state = activeTouches.get(event.pointerId);
    if (!state) return;
    activeTouches.delete(event.pointerId);
    lastTouchRelease = { button: state.button, at: performance.now() };
  };
  document.addEventListener("pointerdown", remember, { capture: true, passive: true });
  document.addEventListener("pointerup", release, { capture: true, passive: true });
  document.addEventListener("pointercancel", (event) => activeTouches.delete(event.pointerId), { capture: true, passive: true });
  if (!("PointerEvent" in window)) {
    document.addEventListener("touchstart", (event) => { for (const touch of event.changedTouches) activeTouches.set(touch.identifier, { button: getButton(touch.target) }); }, { capture: true, passive: true });
    document.addEventListener("touchend", (event) => { for (const touch of event.changedTouches) { const state = activeTouches.get(touch.identifier); if (state) { activeTouches.delete(touch.identifier); lastTouchRelease = { button: state.button, at: performance.now() }; } } }, { capture: true, passive: true });
    document.addEventListener("touchcancel", (event) => { for (const touch of event.changedTouches) activeTouches.delete(touch.identifier); }, { capture: true, passive: true });
  }
  document.addEventListener("click", (event) => {
    if (!lastTouchRelease) return;
    if (performance.now() - lastTouchRelease.at > 1200) { lastTouchRelease = null; return; }
    const clickedButton = getButton(event.target);
    const originalButton = lastTouchRelease.button;
    lastTouchRelease = null;
    // Canvas/grid clicks are intentional non-button actions, such as quick
    // assembly. Only guard a touch when at least one side is a button.
    if (!originalButton && !clickedButton) return;
    const sameButton = originalButton && clickedButton && (originalButton === clickedButton || originalButton.contains(clickedButton) || clickedButton.contains(originalButton));
    if (event.detail !== 0 && !sameButton) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
};
installTouchReleaseGuard();

const isTouchLikePointer = (event) => event.pointerType === "touch" || event.pointerType === "pen";
const touchHandledUntil = new WeakMap();
const markTouchHandled = (element) => touchHandledUntil.set(element, performance.now() + 1200);
const consumeSyntheticTouchClick = (element, event) => {
  const until = touchHandledUntil.get(element) ?? 0;
  if (!until || performance.now() > until || event.detail === 0) return false;
  touchHandledUntil.delete(element);
  event.preventDefault();
  event.stopImmediatePropagation();
  return true;
};

const bindTap = (element, handler) => {
  if (!element) return;
  let activePointerId = null;
  element.addEventListener("pointerdown", (event) => {
    if (isTouchLikePointer(event)) activePointerId = event.pointerId;
  }, { passive: true });
  element.addEventListener("pointerup", (event) => {
    if (!isTouchLikePointer(event) || activePointerId !== event.pointerId) return;
    activePointerId = null;
    if (element.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    markTouchHandled(element);
    handler(event);
  }, { passive: false });
  element.addEventListener("pointercancel", (event) => {
    if (event.pointerId === activePointerId) activePointerId = null;
  }, { passive: true });
  element.addEventListener("click", (event) => {
    if (consumeSyntheticTouchClick(element, event)) return;
    // Native click is fired after release for mouse, touch and keyboard.
    if (!element.disabled) handler(event);
  });
};

// 设置项的整行都是释放触发区域，避免手机只点到文字时依赖浏览器的
// label 默认行为而失效。直接点击复选框仍交给原生 change 事件处理。
const bindSettingToggle = (input, handler) => {
  if (!input) return;
  const label = input.closest("label");
  let activePointerId = null;
  const emit = () => {
    label?.setAttribute("aria-checked", String(input.checked));
    handler?.(input.checked);
  };
  input.addEventListener("change", emit);
  label?.addEventListener("pointerdown", (event) => {
    if (isTouchLikePointer(event)) activePointerId = event.pointerId;
  }, { passive: true });
  label?.addEventListener("pointerup", (event) => {
    if (!isTouchLikePointer(event) || activePointerId !== event.pointerId) return;
    activePointerId = null;
    event.preventDefault();
    event.stopPropagation();
    input.checked = !input.checked;
    markTouchHandled(label);
    emit();
  }, { passive: false });
  label?.addEventListener("pointercancel", (event) => {
    if (event.pointerId === activePointerId) activePointerId = null;
  }, { passive: true });
  label?.addEventListener("click", (event) => {
    if (consumeSyntheticTouchClick(label, event)) return;
    if (event.target === input) return;
    event.preventDefault();
    input.checked = !input.checked;
    emit();
  });
  label?.setAttribute("role", "switch");
  label?.setAttribute("aria-checked", String(input.checked));
};

const bindVolumeRange = (input, output, handler) => {
  if (!input) return;
  const emit = () => {
    const value = Math.max(0, Math.min(300, Number(input.value) || 0));
    if (output) output.textContent = `${value}%`;
    handler?.(value / 100);
  };
  input.addEventListener("input", emit);
  input.addEventListener("change", emit);
  emit();
};

export class UI {
  constructor() {
    this.moduleGlowToggle = document.querySelector("#module-glow-toggle");
    this.deleteZone = document.querySelector("#delete-zone");
    this.moreMenuButton = document.querySelector("#more-menu-button"); this.moreMenuPanel = document.querySelector("#more-menu-panel"); this.settingsButton = document.querySelector("#settings-button"); this.settingsModal = document.querySelector("#settings-modal"); this.settingsClose = document.querySelector("#settings-close"); this.changelogButton = document.querySelector("#changelog-button"); this.changelogModal = document.querySelector("#changelog-modal"); this.changelogClose = document.querySelector("#changelog-close"); this.changelogContent = document.querySelector("#changelog-content"); this.damageNumberToggle = document.querySelector("#damage-number-toggle"); this.vibrationToggle = document.querySelector("#vibration-toggle"); this.countdownToggle = document.querySelector("#countdown-toggle"); this.musicVolumeInput = document.querySelector("#music-volume"); this.musicVolumeValue = document.querySelector("#music-volume-value"); this.soundVolumeInput = document.querySelector("#sound-volume"); this.soundVolumeValue = document.querySelector("#sound-volume-value");
    queueMicrotask(() => this.enableDeleteZone());
    for (const id of ["main-menu-screen", "mode-screen", "dodge-difficulty-screen", "tutorial-screen", "level-select-screen", "encyclopedia-screen", "encyclopedia-events-screen", "builder-screen", "battle-screen", "more-menu-button", "more-menu-panel", "open-builder-button", "menu-battle-button", "encyclopedia-button", "encyclopedia-back-button", "encyclopedia-content", "encyclopedia-events-back-button", "encyclopedia-events-content", "mode-back-button", "endless-mode-button", "level-mode-button", "dodge-mode-button", "dodge-difficulty-back-button", "dodge-difficulty-actions", "tutorial-button", "tutorial-exit-button", "tutorial-action-button", "tutorial-prev-button", "tutorial-next-button", "tutorial-progress-text", "tutorial-progress-fill", "tutorial-step-tag", "tutorial-step-title", "tutorial-step-body", "tutorial-dots", "level-back-button", "level-grid", "builder-save-button", "battle-menu-button", "battle-countdown", "battle-countdown-value", "tutorial-battle-exit", "tutorial-battle-hint", "next-level-button", "return-level-select-button", "pause-overlay", "pause-continue-button", "pause-return-button", "pause-confirm", "pause-cancel-button", "pause-confirm-button", "clear-loadout", "synergy-config-button", "synergy-config-modal", "synergy-config-close", "synergy-config-list", "quick-assembly-toggle", "builder-undo-button", "loadout-code-button", "loadout-code-modal", "loadout-code-close", "loadout-code-input", "loadout-code-message", "loadout-code-export", "loadout-code-import", "attack-speed-modal", "attack-speed-close", "module-detail-modal", "module-detail-close", "detail-icon-canvas", "detail-type", "detail-name", "detail-description", "detail-stats", "assembly-board", "module-library", "module-library-scrollbar", "module-library-scrollbar-thumb", "skill-panel", "health-value", "score-value", "level-value", "time-value", "attack-speed-value", "final-score-value", "loadout-status", "preview-attack-speed", "preview-attack-speed-value", "game-over-screen", "game-over-title", "game-over-eyebrow", "game-over-message"]) this[id.replaceAll("-", "_")] = document.querySelector(`#${id}`);
    this.menuScreen = this.main_menu_screen; this.modeScreen = this.mode_screen; this.tutorialScreen = this.tutorial_screen; this.levelSelectScreen = this.level_select_screen; this.encyclopediaScreen = this.encyclopedia_screen; this.encyclopediaEventsScreen = this.encyclopedia_events_screen; this.builderScreen = this.builder_screen; this.battleScreen = this.battle_screen;
    this.tutorialButton = this.tutorial_button; this.tutorialExitButton = this.tutorial_exit_button; this.tutorialActionButton = this.tutorial_action_button; this.tutorialPrevButton = this.tutorial_prev_button; this.tutorialNextButton = this.tutorial_next_button; this.tutorialProgressText = this.tutorial_progress_text; this.tutorialProgressFill = this.tutorial_progress_fill; this.tutorialStepTag = this.tutorial_step_tag; this.tutorialStepTitle = this.tutorial_step_title; this.tutorialStepBody = this.tutorial_step_body; this.tutorialDots = this.tutorial_dots; this.tutorialBattleExitButton = this.tutorial_battle_exit; this.tutorialBattleHint = this.tutorial_battle_hint;
    this.dodgeModeButton = this.dodge_mode_button; this.dodgeDifficultyScreen = this.dodge_difficulty_screen; this.dodgeDifficultyBackButton = this.dodge_difficulty_back_button; this.dodgeDifficultyActions = this.dodge_difficulty_actions;
    this.openBuilderButton = this.open_builder_button; this.menuBattleButton = this.menu_battle_button; this.encyclopediaButton = this.encyclopedia_button; this.encyclopediaBackButton = this.encyclopedia_back_button; this.encyclopediaContent = this.encyclopedia_content; this.encyclopediaEventsBackButton = this.encyclopedia_events_back_button; this.encyclopediaEventsContent = this.encyclopedia_events_content; this.modeBackButton = this.mode_back_button; this.endlessModeButton = this.endless_mode_button; this.levelModeButton = this.level_mode_button; this.levelBackButton = this.level_back_button; this.levelGrid = this.level_grid; this.builderSaveButton = this.builder_save_button; this.battleMenuButton = this.battle_menu_button; this.nextLevelButton = this.next_level_button; this.returnLevelSelectButton = this.return_level_select_button; this.pauseOverlay = this.pause_overlay; this.pauseContinueButton = this.pause_continue_button; this.pauseReturnButton = this.pause_return_button; this.pauseConfirm = this.pause_confirm; this.pauseCancelButton = this.pause_cancel_button; this.pauseConfirmButton = this.pause_confirm_button; this.clearButton = this.clear_loadout; this.synergyConfigButton = this.synergy_config_button; this.synergyConfigModal = this.synergy_config_modal; this.synergyConfigClose = this.synergy_config_close; this.synergyConfigList = this.synergy_config_list; this.quickAssemblyToggle = this.quick_assembly_toggle; this.builderUndoButton = this.builder_undo_button; this.loadoutCodeButton = this.loadout_code_button; this.loadoutCodeModal = this.loadout_code_modal; this.loadoutCodeClose = this.loadout_code_close; this.loadoutCodeInput = this.loadout_code_input; this.loadoutCodeMessage = this.loadout_code_message; this.loadoutCodeExport = this.loadout_code_export; this.loadoutCodeImport = this.loadout_code_import; this.attackSpeedModal = this.attack_speed_modal; this.attackSpeedClose = this.attack_speed_close; this.detailModal = this.module_detail_modal; this.detailClose = this.module_detail_close; this.detailIconCanvas = this.detail_icon_canvas; this.detailType = this.detail_type; this.detailName = this.detail_name; this.detailDescription = this.detail_description; this.detailStats = this.detail_stats; this.assemblyBoard = this.assembly_board; this.moduleLibrary = this.module_library; this.moduleLibraryScrollbar = this.module_library_scrollbar; this.moduleLibraryScrollbarThumb = this.module_library_scrollbar_thumb; this.skillPanel = this.skill_panel; this.healthValue = this.health_value; this.scoreValue = this.score_value; this.levelValue = this.level_value; this.timeValue = this.time_value; this.finalScoreValue = this.final_score_value; this.loadoutStatus = this.loadout_status; this.previewAttackSpeed = this.preview_attack_speed; this.gameOverScreen = this.game_over_screen; this.gameOverTitle = this.game_over_title; this.gameOverEyebrow = this.game_over_eyebrow; this.gameOverMessage = this.game_over_message;
    this.environmentButton = document.querySelector("#environment-button"); this.environmentName = document.querySelector("#environment-name"); this.environmentRemaining = document.querySelector("#environment-remaining"); this.environmentDetailModal = document.querySelector("#environment-detail-modal"); this.environmentDetailClose = document.querySelector("#environment-detail-close"); this.environmentDetailName = document.querySelector("#environment-detail-name"); this.environmentDetailDescription = document.querySelector("#environment-detail-description"); this.environmentDetailEffects = document.querySelector("#environment-detail-effects"); this.attackSpeedValue = document.querySelector("#attack-speed-value"); this.battleCountdown = this.battle_countdown; if (!this.battleCountdown) { const wrap = document.querySelector(".battle-canvas-wrap"); this.battleCountdown = document.createElement("div"); this.battleCountdown.id = "battle-countdown"; this.battleCountdown.className = "battle-countdown is-hidden"; this.battleCountdown.setAttribute("aria-live", "assertive"); this.battleCountdown.innerHTML = '<strong id="battle-countdown-value">3</strong><small>READY TO LAUNCH</small>'; wrap?.prepend(this.battleCountdown); } this.battleCountdownValue = this.battle_countdown_value ?? this.battleCountdown.querySelector("#battle-countdown-value"); this.environmentPauseOwned = false; this.tutorialStep = 0;
    this.previewAttackSpeedValue = this.preview_attack_speed_value;
    this.battleScoreObjective = document.querySelector("#battle-score-objective");
    if (!this.battleScoreObjective) {
      const wrap = document.querySelector(".battle-canvas-wrap");
      this.battleScoreObjective = document.createElement("div");
      this.battleScoreObjective.id = "battle-score-objective";
      this.battleScoreObjective.className = "battle-score-objective";
      this.battleScoreObjective.innerHTML = '<span>当前得分 / 目标得分</span><strong><b id="battle-score-current">000000</b><i>/</i><b id="battle-score-target">∞</b></strong>';
      wrap?.prepend(this.battleScoreObjective);
    }
    this.battleScoreCurrent = this.battleScoreObjective.querySelector("#battle-score-current");
    this.battleScoreTarget = this.battleScoreObjective.querySelector("#battle-score-target");
    if (!this.moduleGlowToggle) { const card = this.settingsModal?.querySelector(".settings-card"); this.moduleGlowToggle = document.createElement("input"); this.moduleGlowToggle.id = "module-glow-toggle"; this.moduleGlowToggle.type = "checkbox"; this.moduleGlowToggle.checked = true; const label = document.createElement("label"); label.className = "settings-toggle"; label.append(this.moduleGlowToggle, Object.assign(document.createElement("span"), { textContent: "显示模块光晕" })); card?.append(label); }
    this.moduleGlowToggle.checked = false; setModuleGlowEnabled(false); this.loadout = createLoadout(); this.history = []; this.dragState = null; this.suppressClick = false; this.instanceCounter = 1; this.selectedMode = "endless"; this.selectedLevel = 1; this.quickAssemblyEnabled = false; this.quickAssemblyModuleId = null; this.tutorialActionsDone = new Set(); this.tutorialContext = null; this.tutorialBuilderInitialSignature = "";
    this.boardView = { scale: 1, offsetX: 0, offsetY: 0 }; this.boardPointers = new Map(); this.boardGesture = null; this.quickAssemblyPointer = null;
    this.selectedDodgeDifficulty = "easy";
    this.beyondRun = null; this.beyondPendingNode = null; this.beyondBuilderMode = false;
    installBeyondLightConeUI(this);
    this.appAmbient = new AppAmbientRenderer(document.querySelector("#app-ambient-canvas"), document.querySelector(".app-shell")); this.appAmbient.start();
    this.menuAmbient = new MainMenuFlightRenderer(document.querySelector("#menu-ambient-canvas"), this.menuScreen, document.querySelector(".menu-aircraft"), () => this.loadout);
    this.renderModuleLibrary(); this.renderAssembly(); this.renderLevelGrid(); this.renderDodgeDifficulty(); this.renderEncyclopedia(); this.showMenu();
    bindTap(this.moreMenuButton, () => this.toggleMoreMenu()); document.addEventListener("pointerup", (event) => this.dismissMoreMenuOutside(event), true); document.addEventListener("click", (event) => this.dismissMoreMenuOutside(event), true); bindTap(this.settingsButton, () => { this.hideMoreMenu(); this.settingsModal.classList.remove("is-hidden"); }); bindTap(this.settingsClose, () => this.settingsModal.classList.add("is-hidden")); bindTap(this.changelogButton, () => { this.hideMoreMenu(); void this.showChangelog(); }); bindTap(this.changelogClose, () => this.hideChangelog()); this.settingsModal.addEventListener("click", (event) => { if (event.target === this.settingsModal) this.settingsModal.classList.add("is-hidden"); }); this.changelogModal.addEventListener("click", (event) => { if (event.target === this.changelogModal) this.hideChangelog(); }); bindSettingToggle(this.damageNumberToggle, (enabled) => this.onDamageNumbersChanged?.(enabled)); bindSettingToggle(this.vibrationToggle, (enabled) => this.onVibrationChanged?.(enabled)); bindSettingToggle(this.countdownToggle, (enabled) => this.onCountdownChanged?.(enabled)); bindVolumeRange(this.musicVolumeInput, this.musicVolumeValue, (value) => this.onMusicVolumeChanged?.(value)); bindVolumeRange(this.soundVolumeInput, this.soundVolumeValue, (value) => this.onSoundVolumeChanged?.(value)); bindSettingToggle(this.moduleGlowToggle, (enabled) => { setModuleGlowEnabled(enabled); this.paintIcons(this.moduleLibrary); this.paintIcons(this.assemblyBoard); });
    bindTap(this.environmentButton, () => this.showEnvironmentDetail()); bindTap(this.environmentDetailClose, () => this.hideEnvironmentDetail()); this.environmentDetailModal?.addEventListener("click", (event) => { if (event.target === this.environmentDetailModal) this.hideEnvironmentDetail(); });
    this.moduleLibrary.addEventListener("pointerdown", (event) => { const source = event.target.closest("[data-drag-module]"); if (source && !this.quickAssemblyEnabled) this.beginDrag(source.dataset.dragModule, null, event); });
    this.moduleLibrary.addEventListener("pointerup", (event) => {
      if (!isTouchLikePointer(event) || !this.quickAssemblyEnabled) return;
      const source = event.target.closest("[data-drag-module]");
      if (!source) return;
      event.preventDefault();
      event.stopPropagation();
      markTouchHandled(source);
      this.selectQuickAssemblyModule(source.dataset.dragModule);
    }, { passive: false });
    this.moduleLibrary.addEventListener("click", (event) => { if (this.suppressClick) return; const source = event.target.closest("[data-drag-module]"); if (!source || consumeSyntheticTouchClick(source, event)) return; if (this.quickAssemblyEnabled) this.selectQuickAssemblyModule(source.dataset.dragModule); else this.showModuleDetail(getModuleById(source.dataset.dragModule)); });
    this.assemblyBoard.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-board-view]")) return;
      const source = event.target.closest("[data-instance-id]");
      if (!this.quickAssemblyEnabled && source) { this.beginDrag(source.dataset.moduleId, source.dataset.instanceId, event); return; }
      if (this.quickAssemblyEnabled) this.quickAssemblyPointer = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
      this.beginBoardGesture(event);
      if (this.quickAssemblyEnabled) this.updateQuickAssemblyPreview(event);
    });
    this.assemblyBoard.addEventListener("pointerenter", (event) => this.updateQuickAssemblyPreview(event));
    this.assemblyBoard.addEventListener("pointermove", (event) => {
      const quickPointer = this.quickAssemblyPointer;
      if (quickPointer?.pointerId === event.pointerId && Math.hypot(event.clientX - quickPointer.startX, event.clientY - quickPointer.startY) > 6) quickPointer.moved = true;
      if (!this.moveBoardGesture(event)) this.updateQuickAssemblyPreview(event);
    }, { passive: false });
    this.assemblyBoard.addEventListener("pointerleave", () => this.hideQuickAssemblyPreview());
    this.assemblyBoard.addEventListener("pointerup", (event) => {
      const tap = this.endBoardGesture(event);
      if (!this.quickAssemblyEnabled) return;
      if (this.finishQuickAssemblyPointer(event)) return;
      if (!tap) return;
      event.preventDefault();
      event.stopPropagation();
      markTouchHandled(this.assemblyBoard);
      this.handleQuickAssemblyClick(event);
    }, { passive: false });
    this.assemblyBoard.addEventListener("pointercancel", (event) => { if (this.quickAssemblyPointer?.pointerId === event.pointerId) this.quickAssemblyPointer = null; this.cancelBoardGesture(event); }, { passive: false });
    this.assemblyBoard.addEventListener("lostpointercapture", (event) => this.cancelBoardGesture(event), { passive: false });
    this.assemblyBoard.addEventListener("click", (event) => {
      const viewAction = event.target.closest("[data-board-view]");
      if (viewAction) { this.handleBoardViewAction(viewAction.dataset.boardView); return; }
      if (this.suppressClick) return;
      if (consumeSyntheticTouchClick(this.assemblyBoard, event)) return;
      this.handleQuickAssemblyClick(event);
    });
    this.assemblyBoard.addEventListener("wheel", (event) => { event.preventDefault(); this.zoomBoardAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX, event.clientY); }, { passive: false });
    document.querySelector("#assembly-view-controls")?.addEventListener("click", (event) => { const control = event.target.closest("[data-board-view]"); if (control) this.handleBoardViewAction(control.dataset.boardView); });
    window.addEventListener("pointermove", (event) => this.moveDrag(event), { passive: false }); window.addEventListener("pointerup", (event) => { this.endDrag(event); this.finishQuickAssemblyPointer(event); }, { passive: false }); window.addEventListener("pointercancel", (event) => this.endDrag(event));
    this.skillPanel.addEventListener("pointerup", (event) => {
      if (!isTouchLikePointer(event)) return;
      const button = event.target.closest("[data-skill-index]");
      if (!button || button.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      markTouchHandled(button);
      this.onSkill?.(Number(button.dataset.skillIndex));
    }, { passive: false });
    this.skillPanel.addEventListener("click", (event) => { const button = event.target.closest("[data-skill-index]"); if (button && !consumeSyntheticTouchClick(button, event) && !button.disabled) this.onSkill?.(Number(button.dataset.skillIndex)); });
    bindTap(this.clearButton, () => { this.pushHistory(); this.loadout = createLoadout({ modules: [] }); this.renderAssembly(); this.setStatus("\u88c5\u914d\u533a\u5df2\u6e05\u7a7a"); });
    bindTap(this.synergyConfigButton, () => this.openSynergyConfig()); bindTap(this.synergyConfigClose, () => this.hideSynergyConfig()); this.synergyConfigModal?.addEventListener("click", (event) => { if (event.target === this.synergyConfigModal) this.hideSynergyConfig(); });
    bindTap(this.loadoutCodeButton, () => this.openLoadoutCode()); bindTap(this.loadoutCodeClose, () => this.hideLoadoutCode()); bindTap(this.loadoutCodeExport, () => { void this.copyLoadoutCode(); }); bindTap(this.loadoutCodeImport, () => this.importLoadoutCode()); this.loadoutCodeModal.addEventListener("click", (event) => { if (event.target === this.loadoutCodeModal) this.hideLoadoutCode(); });
    bindTap(this.previewAttackSpeed, () => this.showAttackSpeedRules()); bindTap(this.attackSpeedClose, () => this.hideAttackSpeedRules()); this.attackSpeedModal.addEventListener("click", (event) => { if (event.target === this.attackSpeedModal) this.hideAttackSpeedRules(); });
    this.moduleLibrary.addEventListener("scroll", () => this.updateLibraryScrollbar(), { passive: true }); this.moduleLibraryScrollbar.addEventListener("pointerdown", (event) => this.beginLibraryScrollbarDrag(event)); this.moduleLibraryScrollbar.addEventListener("pointermove", (event) => this.moveLibraryScrollbarDrag(event)); this.moduleLibraryScrollbar.addEventListener("pointerup", (event) => this.endLibraryScrollbarDrag(event)); this.moduleLibraryScrollbar.addEventListener("pointercancel", (event) => this.endLibraryScrollbarDrag(event));
    bindTap(this.builderUndoButton, () => this.undo()); bindTap(this.detailClose, () => this.hideModuleDetail()); this.detailModal.addEventListener("click", (event) => { if (event.target === this.detailModal) this.hideModuleDetail(); });
  }

  enableDeleteZone() {
    this.assemblyBoard.addEventListener("pointerdown", (event) => {
      if (!this.quickAssemblyEnabled && event.target.closest("[data-instance-id]")) this.deleteZone.classList.add("is-active");
    });
    window.addEventListener("pointerup", (event) => {
      const state = this.dragState;
      if (!state?.instanceId) return;
      const rect = this.deleteZone.getBoundingClientRect();
      const overDelete = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (overDelete && event.pointerId === state.pointerId) {
        const candidate = { ...this.loadout, modules: this.loadout.modules.filter((entry) => entry.instanceId !== state.instanceId) };
        this.pushHistory();
        this.loadout = pruneDisconnected(candidate).loadout;
        this.renderAssembly();
        this.setStatus("\u6a21\u5757\u5df2\u5220\u9664");
      }
      this.deleteZone.classList.remove("is-active");
    }, true);
    window.addEventListener("pointercancel", () => this.deleteZone.classList.remove("is-active"), true);
  }

  bind({ onStart, onMenu, onPause, onResume, onSkill, onDamageNumbersChanged, onVibrationChanged, onCountdownChanged, onMusicVolumeChanged, onSoundVolumeChanged, onNextLevel, onBeyondStageContinue, onLevelSelect, onModeSelect, onTutorialBattleExit, onEnvironmentPause, onEnvironmentResume }) {
    this.onStart = onStart; this.onMenu = onMenu; this.onPause = onPause; this.onResume = onResume; this.onSkill = onSkill; this.onDamageNumbersChanged = onDamageNumbersChanged; this.onVibrationChanged = onVibrationChanged; this.onCountdownChanged = onCountdownChanged; this.onMusicVolumeChanged = onMusicVolumeChanged; this.onSoundVolumeChanged = onSoundVolumeChanged; this.onNextLevel = onNextLevel; this.onBeyondStageContinue = onBeyondStageContinue; this.onLevelSelect = onLevelSelect; this.onModeSelect = onModeSelect; this.onTutorialBattleExit = onTutorialBattleExit; this.onEnvironmentPause = onEnvironmentPause; this.onEnvironmentResume = onEnvironmentResume;
    bindTap(this.openBuilderButton, () => this.showBuilder()); bindTap(this.menuBattleButton, () => this.showModeSelect()); bindTap(this.encyclopediaButton, () => this.showEncyclopedia()); bindTap(this.encyclopediaBackButton, () => this.showMenu({ direction: "back" })); bindTap(this.encyclopediaEventsBackButton, () => this.showEncyclopedia({ direction: "back" })); bindTap(this.modeBackButton, () => this.showMenu({ direction: "back" })); bindTap(this.endlessModeButton, () => { this.selectedMode = "endless"; this.requestStart(); }); bindTap(this.levelModeButton, () => this.showLevelSelect()); bindTap(this.dodgeModeButton, () => this.showDodgeDifficulty()); bindTap(this.dodgeDifficultyBackButton, () => this.showModeSelect({ direction: "back" })); bindTap(this.tutorialButton, () => this.showTutorial()); bindTap(this.tutorialExitButton, () => this.showModeSelect({ direction: "back" })); bindTap(this.tutorialActionButton, () => this.handleTutorialAction()); bindTap(this.tutorialPrevButton, () => this.previousTutorialStep()); bindTap(this.tutorialNextButton, () => this.nextTutorialStep()); bindTap(this.levelBackButton, () => this.showModeSelect({ direction: "back" }));
    this.dodgeDifficultyActions.querySelectorAll("[data-dodge-difficulty]").forEach((button) => bindTap(button, () => { this.selectedMode = "dodge"; this.selectedDodgeDifficulty = button.dataset.dodgeDifficulty; this.requestStart(); }));
    this.levelGrid.querySelectorAll("[data-level]").forEach((button) => bindTap(button, () => { this.selectedMode = "levels"; this.selectedLevel = Number(button.dataset.level); this.requestStart(); }));
    bindTap(this.builderSaveButton, () => this.saveBuild()); bindTap(this.quickAssemblyToggle, () => this.setQuickAssembly(!this.quickAssemblyEnabled)); bindTap(this.battleMenuButton, () => this.onPause?.()); bindTap(this.tutorialBattleExitButton, () => this.onTutorialBattleExit?.()); bindTap(this.nextLevelButton, () => (this.gameOverReturnTarget === "beyond" ? this.onBeyondStageContinue?.() : this.onNextLevel?.())); bindTap(this.returnLevelSelectButton, () => (this.gameOverReturnTarget === "mode" ? this.onModeSelect?.() : this.onLevelSelect?.()));
    bindTap(this.pauseContinueButton, () => this.onResume?.()); bindTap(this.pauseReturnButton, () => { if (this.onBeyondPauseReturn?.()) return; this.pauseConfirm.classList.remove("is-hidden"); }); bindTap(this.pauseCancelButton, () => this.pauseConfirm.classList.add("is-hidden")); bindTap(this.pauseConfirmButton, () => this.onMenu?.());
  }
  requestStart() { const result = validateLoadout(this.loadout); if (!result.valid) { this.showBuilder(); this.setStatus(result.reason); return; } this.onStart?.(this.getSelectedIds()); }
  saveBuild() { if (this.tutorialContext === "builder") { const installedModules = this.loadout.modules.map(({ module }) => module).filter(Boolean); const hasAutomaticWeapon = installedModules.some((module) => module.type === "weapon"); const hasActiveSkill = installedModules.some((module) => Boolean(module.skill)); if (!hasAutomaticWeapon || !hasActiveSkill) { this.setStatus(`教程要求同时装配自动模块和技能模块（当前${hasAutomaticWeapon ? "已" : "未"}装配自动模块，${hasActiveSkill ? "已" : "未"}装配技能模块）`); return; } this.history = []; this.tutorialActionsDone.add(0); this.tutorialContext = null; this.showTutorial(1, false); return; } this.history = []; this.onMenu?.(); }
  openLoadoutCode() { try { this.loadoutCodeInput.value = encodeLoadoutCode(this.loadout); this.loadoutCodeMessage.textContent = `已生成 ${this.loadout.modules.length} 个模块的配置码`; this.loadoutCodeModal.classList.remove("is-hidden"); requestAnimationFrame(() => { this.loadoutCodeInput.focus(); this.loadoutCodeInput.select(); }); } catch (error) { this.setStatus(error instanceof Error ? error.message : "无法生成配置码"); } }
  async showChangelog() {
    this.changelogModal?.classList.remove("is-hidden");
    if (!this.changelogContent) return;
    this.changelogContent.textContent = "正在加载更新日志…";
    try {
      const response = await fetch("./CHANGELOG.md", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.changelogContent.textContent = await response.text();
    } catch (error) {
      this.changelogContent.textContent = `更新日志加载失败：${error instanceof Error ? error.message : "无法读取 CHANGELOG.md"}`;
    }
  }
  hideChangelog() { this.changelogModal?.classList.add("is-hidden"); }
  hideLoadoutCode() { this.loadoutCodeModal?.classList.add("is-hidden"); }
  openSynergyConfig() { this.renderSynergyConfig(); this.synergyConfigModal?.classList.remove("is-hidden"); }
  hideSynergyConfig() { this.synergyConfigModal?.classList.add("is-hidden"); }
  renderSynergyConfig() {
    if (!this.synergyConfigList) return;
    const states = getSynergyStates(this.loadout);
    this.synergyConfigList.innerHTML = states.map((synergy) => {
      const active = synergy.activeSelections.length > 0;
      const requirements = synergy.requirements.map((moduleId) => getModuleById(moduleId)?.name ?? moduleId).join(" + ");
      const status = active ? "已装配" : synergy.availableSelection ? "可装配" : "需求未满足或模块已被占用";
      const removeActions = synergy.activeSelections.map((selection) => `<button class="synergy-link-button" type="button" data-synergy-remove="${synergy.id}" data-synergy-modules="${selection.moduleInstanceIds.join(",")}">卸下</button>`).join("");
      const equipAction = synergy.availableSelection ? `<button class="synergy-link-button is-ready" type="button" data-synergy-equip="${synergy.id}" data-synergy-modules="${synergy.availableSelection.moduleInstanceIds.join(",")}">装配连携</button>` : "";
      const typeLabel = synergy.type === "automatic" ? "自动连携" : synergy.type === "passive" ? "被动连携" : "主动连携";
      const stateClass = active ? "is-active" : synergy.availableSelection ? "is-available" : "is-unavailable";
      return `<article class="synergy-link-card ${stateClass}"><div><p class="synergy-link-type">${typeLabel}</p><h4>${escapeHtml(synergy.name)}</h4></div><span class="synergy-link-status">${status}</span><p>${escapeHtml(synergy.description)}</p><small>需求：${escapeHtml(requirements)}</small>${removeActions}${equipAction}</article>`;
    }).join("") || "<p class=\"detail-description\">暂无可用连携能力。</p>";
    this.synergyConfigList.querySelectorAll("[data-synergy-equip]").forEach((button) => bindTap(button, () => this.equipSynergy(button.dataset.synergyEquip, String(button.dataset.synergyModules ?? "").split(",").filter(Boolean))));
    this.synergyConfigList.querySelectorAll("[data-synergy-remove]").forEach((button) => bindTap(button, () => this.removeSynergy(button.dataset.synergyRemove, String(button.dataset.synergyModules ?? "").split(",").filter(Boolean))));
  }
  equipSynergy(id, moduleInstanceIds) {
    const candidate = { ...this.loadout, synergies: [...this.loadout.synergies, { id, moduleInstanceIds }] };
    const synergies = normalizeSynergies(candidate);
    if (synergies.length === this.loadout.synergies.length) { this.setStatus("当前模块不能装配这个连携能力"); return; }
    this.pushHistory(); this.loadout = { ...candidate, synergies }; this.renderAssembly(); this.renderSynergyConfig(); this.setStatus("连携能力已装配");
  }
  removeSynergy(id, moduleInstanceIds) {
    const signature = moduleInstanceIds.join(",");
    this.pushHistory(); this.loadout = { ...this.loadout, synergies: this.loadout.synergies.filter((synergy) => synergy.id !== id || synergy.moduleInstanceIds.join(",") !== signature) };
    this.renderAssembly(); this.renderSynergyConfig(); this.setStatus("连携能力已卸下");
  }
  showAttackSpeedRules() { this.attackSpeedModal?.classList.remove("is-hidden"); }
  hideAttackSpeedRules() { this.attackSpeedModal?.classList.add("is-hidden"); }
  async copyLoadoutCode() { try { const code = encodeLoadoutCode(this.loadout); this.loadoutCodeInput.value = code; let copied = false; if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(code); copied = true; } if (!copied) { this.loadoutCodeInput.focus(); this.loadoutCodeInput.select(); try { copied = document.execCommand("copy"); } catch {} } this.loadoutCodeMessage.textContent = copied ? "配置码已复制" : "配置码已生成，可长按或全选复制"; } catch (error) { this.loadoutCodeMessage.textContent = error instanceof Error ? error.message : "无法复制配置码"; } }
  importLoadoutCode() { try { const { loadout, moduleCount } = decodeLoadoutCode(this.loadoutCodeInput.value); this.pushHistory(); this.loadout = loadout; this.instanceCounter = Math.max(this.instanceCounter, moduleCount + 1); this.renderAssembly(); this.hideLoadoutCode(); this.setStatus(`已导入 ${moduleCount} 个模块`); } catch (error) { this.loadoutCodeMessage.textContent = error instanceof Error ? error.message : "配置码无效"; } }
   getSelectedIds() { return { modules: this.loadout.modules.map(({ instanceId, moduleId, x, y, rotation }) => ({ instanceId, moduleId, x, y, rotation })), synergies: this.loadout.synergies.map(({ id, moduleInstanceIds }) => ({ id, moduleInstanceIds: [...moduleInstanceIds] })), mode: this.selectedMode, level: this.selectedLevel, dodgeDifficulty: this.selectedDodgeDifficulty }; }
  getLoadoutSignature() { return this.loadout.modules.map(({ instanceId, moduleId, x, y, rotation }) => `${instanceId}:${moduleId}:${x}:${y}:${rotation}`).sort().join("|"); }
  setStatus(message) { this.loadoutStatus.textContent = message; }
  setQuickAssembly(enabled) { this.quickAssemblyEnabled = Boolean(enabled); if (!this.quickAssemblyEnabled) { this.quickAssemblyModuleId = null; this.hideQuickAssemblyPreview(); } this.quickAssemblyToggle.classList.toggle("is-active", this.quickAssemblyEnabled); this.quickAssemblyToggle.setAttribute("aria-pressed", String(this.quickAssemblyEnabled)); this.quickAssemblyToggle.querySelector("small").textContent = this.quickAssemblyEnabled ? "ON" : "OFF"; this.moduleLibrary.querySelectorAll("[data-drag-module]").forEach((node) => node.classList.toggle("is-quick-selected", node.dataset.dragModule === this.quickAssemblyModuleId)); this.setStatus(this.quickAssemblyEnabled ? "快捷装配已开启：选择模块后点击核心网络" : "快捷装配已关闭"); }
  selectQuickAssemblyModule(moduleId) { const module = getModuleById(moduleId); if (!module) return; this.quickAssemblyModuleId = module.id; this.hideQuickAssemblyPreview(); this.hideModuleDetail(); this.moduleLibrary.querySelectorAll("[data-drag-module]").forEach((node) => node.classList.toggle("is-quick-selected", node.dataset.dragModule === module.id)); this.setStatus(`已选择${module.name}：点击核心网络装配`); }
  handleQuickAssemblyClick(event) { if (!this.quickAssemblyEnabled || !this.quickAssemblyModuleId || this.dragState) return; const rect = this.assemblyBoard.getBoundingClientRect(); if (!rect.width || !rect.height) return; const x = Math.max(0, Math.min(ASSEMBLY_BOARD.columns - 1, Math.floor((event.clientX - rect.left) / (rect.width / ASSEMBLY_BOARD.columns)))); const y = Math.max(0, Math.min(ASSEMBLY_BOARD.rows - 1, Math.floor((event.clientY - rect.top) / (rect.height / ASSEMBLY_BOARD.rows)))); const module = getModuleById(this.quickAssemblyModuleId); const installed = this.placeModule(module, x, y); this.setStatus(installed ? `已装配${module.name}，可继续点击网络` : "此位置无法装配，请选择相邻空位"); }
  hideQuickAssemblyPreview() { if (this.quickPreview) this.quickPreview.classList.remove("is-visible"); this.assemblyBoard?.querySelectorAll(".placed-module.at-risk").forEach((node) => node.classList.remove("at-risk")); }
  updateQuickAssemblyPreview(event) { if (!this.quickAssemblyEnabled || !this.quickAssemblyModuleId || this.dragState) { this.hideQuickAssemblyPreview(); return; } const rect = this.assemblyBoard.getBoundingClientRect(); if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) { this.hideQuickAssemblyPreview(); return; } const module = getModuleById(this.quickAssemblyModuleId); if (!module) return; if (!this.quickPreview || !this.quickPreview.isConnected) { this.quickPreview = document.createElement("div"); this.quickPreview.className = `drag-preview placed-${module.type}`; this.quickPreview.innerHTML = `<canvas class="placed-icon-canvas" width="48" height="48"></canvas>`; this.assemblyBoard.appendChild(this.quickPreview); } if (this.quickPreview.dataset.moduleId !== module.id) { this.quickPreview.dataset.moduleId = module.id; this.quickPreview.className = `drag-preview placed-${module.type}`; paintModuleCanvas(this.quickPreview.querySelector("canvas"), module, 48); } const x = Math.max(0, Math.min(ASSEMBLY_BOARD.columns - 1, Math.floor((event.clientX - rect.left) / (rect.width / ASSEMBLY_BOARD.columns)))); const y = Math.max(0, Math.min(ASSEMBLY_BOARD.rows - 1, Math.floor((event.clientY - rect.top) / (rect.height / ASSEMBLY_BOARD.rows)))); const candidate = this.buildCandidate(module, x, y); const staticValid = validateGeometry(candidate, { requireConnected: false }).valid; const repair = staticValid ? pruneDisconnected(candidate) : { removed: [] }; const bounds = getFootprintBounds(module); const removedIds = new Set(repair.removed.map((entry) => entry.instanceId)); this.assemblyBoard.querySelectorAll(".placed-module").forEach((node) => node.classList.toggle("at-risk", removedIds.has(node.dataset.instanceId))); this.quickPreview.style.left = `${((x + bounds.minX) / ASSEMBLY_BOARD.columns) * 100}%`; this.quickPreview.style.top = `${((y + bounds.minY) / ASSEMBLY_BOARD.rows) * 100}%`; this.quickPreview.style.width = `${(bounds.width / ASSEMBLY_BOARD.columns) * 100}%`; this.quickPreview.style.height = `${(bounds.height / ASSEMBLY_BOARD.rows) * 100}%`; this.quickPreview.classList.add("is-visible"); this.quickPreview.classList.toggle("preview-valid", staticValid && repair.removed.length === 0); this.quickPreview.classList.toggle("preview-impact", staticValid && repair.removed.length > 0); this.quickPreview.classList.toggle("preview-invalid", !staticValid); }
  pushHistory() { this.history.push(this.getSelectedIds()); if (this.history.length > 30) this.history.shift(); }
  undo() { const previous = this.history.pop(); if (!previous) { this.setStatus("\u6ca1\u6709\u53ef\u64a4\u9500\u7684\u6539\u52a8"); return; } this.loadout = createLoadout(previous); this.renderAssembly(); this.setStatus("\u5df2\u64a4\u9500\u4e0a\u4e00\u6b65\u6539\u52a8"); }
  transitionToScreen(target, { direction = "forward", animate = true } = {}) {
    const screens = [this.menuScreen, this.modeScreen, this.dodgeDifficultyScreen, this.tutorialScreen, this.levelSelectScreen, this.encyclopediaScreen, this.encyclopediaEventsScreen, this.builderScreen, this.battleScreen].filter(Boolean);
    if (target !== this.menuScreen) this.menuAmbient?.stop();
    const current = screens.find((screen) => screen !== target && !screen.classList.contains("is-hidden"));
    if (this.screenTransitionTimer) window.clearTimeout(this.screenTransitionTimer);
    screens.forEach((screen) => screen.classList.remove("screen-transitioning-in", "screen-transitioning-out", "screen-direction-forward", "screen-direction-back"));
    if (!animate || !current || current === target) {
      this.hideAllScreens();
      target?.classList.remove("is-hidden");
      return;
    }
    screens.forEach((screen) => {
      if (screen !== current && screen !== target) screen.classList.add("is-hidden");
    });
    current.classList.remove("is-hidden");
    target.classList.remove("is-hidden");
    current.classList.add("screen-transitioning-out", `screen-direction-${direction}`);
    target.classList.add("screen-transitioning-in", `screen-direction-${direction}`);
    this.screenTransitionTimer = window.setTimeout(() => {
      current.classList.add("is-hidden");
      current.classList.remove("screen-transitioning-out", `screen-direction-${direction}`);
      target.classList.remove("screen-transitioning-in", `screen-direction-${direction}`);
      this.screenTransitionTimer = null;
    }, 300);
  }
  hideAllScreens() {
    this.menuAmbient?.stop();
    if (this.screenTransitionTimer) window.clearTimeout(this.screenTransitionTimer);
    this.screenTransitionTimer = null;
    [this.menuScreen, this.modeScreen, this.dodgeDifficultyScreen, this.tutorialScreen, this.levelSelectScreen, this.encyclopediaScreen, this.encyclopediaEventsScreen, this.builderScreen, this.battleScreen].forEach((screen) => {
      screen?.classList.remove("screen-transitioning-in", "screen-transitioning-out", "screen-direction-forward", "screen-direction-back");
      screen?.classList.add("is-hidden");
    });
  }
  dismissMoreMenuOutside(event) {
    if (this.moreMenuPanel?.classList.contains("is-hidden")) return;
    const target = event.target;
    if (target instanceof Node && (this.moreMenuPanel?.contains(target) || this.moreMenuButton?.contains(target))) return;
    this.hideMoreMenu();
  }
  toggleMoreMenu() { const open = this.moreMenuPanel?.classList.toggle("is-hidden") === false; this.moreMenuButton?.setAttribute("aria-expanded", String(open)); }
  hideMoreMenu() { this.moreMenuPanel?.classList.add("is-hidden"); this.moreMenuButton?.setAttribute("aria-expanded", "false"); }
  showMenu({ direction = "back" } = {}) { this.transitionToScreen(this.menuScreen, { direction }); this.menuAmbient?.start(); this.gameOverScreen.classList.add("is-hidden"); this.hidePause(); this.hideModuleDetail(); this.hideLoadoutCode(); this.hideAttackSpeedRules(); this.hideChangelog(); this.settingsModal.classList.add("is-hidden"); this.hideMoreMenu(); }
  showModeSelect({ direction = "forward" } = {}) { this.transitionToScreen(this.modeScreen, { direction }); }
  showDodgeDifficulty({ direction = "forward" } = {}) { this.transitionToScreen(this.dodgeDifficultyScreen, { direction }); }
  showTutorial(step = 0, reset = true, { direction = "forward" } = {}) { this.transitionToScreen(this.tutorialScreen, { direction }); if (reset) this.tutorialActionsDone.clear(); this.tutorialStep = step; this.renderInteractiveTutorial(); }
  renderInteractiveTutorial() { const step = tutorialSteps[this.tutorialStep]; if (!step) return; const last = this.tutorialStep === tutorialSteps.length - 1; const actionRequired = this.tutorialStep < 2; const hasModeSelectAction = this.tutorialStep === tutorialSteps.length - 1; const actionLabel = this.tutorialStep === 0 ? "打开改装机体" : this.tutorialStep === 1 ? "进入训练战斗" : "进入模式选择"; this.tutorialProgressText.textContent = `${String(this.tutorialStep + 1).padStart(2, "0")} / ${String(tutorialSteps.length).padStart(2, "0")}`; this.tutorialProgressFill.style.width = `${((this.tutorialStep + 1) / tutorialSteps.length) * 100}%`; this.tutorialStepTag.textContent = step.tag; this.tutorialStepTitle.textContent = step.title; this.tutorialStepBody.textContent = step.body; this.tutorialActionButton.classList.toggle("is-hidden", !(actionRequired || hasModeSelectAction)); this.tutorialActionButton.textContent = actionLabel; this.tutorialNextButton.disabled = actionRequired && !this.tutorialActionsDone.has(this.tutorialStep); this.tutorialPrevButton.disabled = this.tutorialStep === 0; this.tutorialNextButton.textContent = last ? "退出教程" : "下一步"; this.tutorialDots.innerHTML = tutorialSteps.map((_, index) => `<i class="${index === this.tutorialStep ? "is-active" : ""}"></i>`).join(""); }
  handleTutorialAction() { if (this.tutorialStep === 0) { this.tutorialContext = "builder"; this.tutorialBuilderInitialSignature = this.getLoadoutSignature(); this.showBuilder(); return; } if (this.tutorialStep === 1) { this.tutorialContext = "battle"; this.onStart?.({ ...this.getSelectedIds(), mode: "tutorial", tutorial: true }); return; } if (this.tutorialStep === tutorialSteps.length - 1) { this.tutorialContext = null; this.showModeSelect(); } }
  completeTutorialAction(step) { this.tutorialActionsDone.add(step); this.tutorialContext = null; }
  renderTutorial() { const step = tutorialSteps[this.tutorialStep]; if (!step) return; const last = this.tutorialStep === tutorialSteps.length - 1; this.tutorialProgressText.textContent = `${String(this.tutorialStep + 1).padStart(2, "0")} / ${String(tutorialSteps.length).padStart(2, "0")}`; this.tutorialProgressFill.style.width = `${((this.tutorialStep + 1) / tutorialSteps.length) * 100}%`; this.tutorialStepTag.textContent = step.tag; this.tutorialStepTitle.textContent = step.title; this.tutorialStepBody.textContent = step.body; this.tutorialPrevButton.disabled = this.tutorialStep === 0; this.tutorialNextButton.textContent = last ? "完成并返回主菜单" : "下一步"; this.tutorialDots.innerHTML = tutorialSteps.map((_, index) => `<i class="${index === this.tutorialStep ? "is-active" : ""}"></i>`).join(""); }
  previousTutorialStep() { this.tutorialStep = Math.max(0, this.tutorialStep - 1); this.renderInteractiveTutorial(); }
  nextTutorialStep() { if (this.tutorialStep >= tutorialSteps.length - 1) { this.showMenu(); return; } this.tutorialStep += 1; this.renderInteractiveTutorial(); }
  showLevelSelect({ direction = "forward" } = {}) { this.transitionToScreen(this.levelSelectScreen, { direction }); }
   renderDodgeDifficulty() { this.dodgeDifficultyActions.innerHTML = DODGE_DIFFICULTIES.map((difficulty) => `<button class="mode-card dodge-difficulty-card" type="button" data-dodge-difficulty="${difficulty.id}"><strong>${difficulty.name}</strong><small>${difficulty.subtitle}</small><span>${difficulty.description}</span></button>`).join(""); }
  showEncyclopedia({ direction = "forward" } = {}) { this.transitionToScreen(this.encyclopediaScreen, { direction }); }
  showBeyondEventArchive({ direction = "forward" } = {}) { this.renderBeyondEventArchive(); this.transitionToScreen(this.encyclopediaEventsScreen, { direction }); }
  showBuilder() { this.hideAllScreens(); this.builderScreen.classList.remove("is-hidden"); this.gameOverScreen.classList.add("is-hidden"); const tutorialBuilder = this.tutorialContext === "builder"; this.builderSaveButton.textContent = tutorialBuilder ? "完成改装演示" : "保存改装"; if (tutorialBuilder) this.setStatus("请从模块仓库拖入一个模块，再点击右上角完成改装演示"); this.hideLoadoutCode(); this.hideAttackSpeedRules(); requestAnimationFrame(() => this.updateLibraryScrollbar()); }
  showPlaying({ hp, maxHp, score, elapsed, attackSpeed = 1, skills = [], level = null, goal = null, boss = false, environment = null, tutorial = false }) { this.hideAllScreens(); this.battleScreen.classList.remove("is-hidden"); this.gameOverScreen.classList.add("is-hidden"); this.hidePause(); this.tutorialBattleExitButton.classList.toggle("is-hidden", !tutorial); this.updateHud({ hp, maxHp, score, elapsed, attackSpeed, level, goal, boss, environment }); this.updateSkills(skills); }
  // Tutorial overrides keep the normal builder and battle flow unchanged while
  // making the required actions visible and verifiable.
   showBuilder({ direction = "forward" } = {}) { this.transitionToScreen(this.builderScreen, { direction }); this.gameOverScreen.classList.add("is-hidden"); const tutorialBuilder = this.tutorialContext === "builder"; this.builderSaveButton.textContent = tutorialBuilder ? "完成改装演示" : "保存改装"; this.moduleLibrary.classList.toggle("tutorial-focus", tutorialBuilder); this.assemblyBoard.classList.toggle("tutorial-focus", tutorialBuilder); this.builderSaveButton.classList.toggle("tutorial-focus", tutorialBuilder && this.getLoadoutSignature() !== this.tutorialBuilderInitialSignature); if (tutorialBuilder) this.setStatus("请装配 1 个自动模块和 1 个技能模块，再点击完成改装演示"); this.hideLoadoutCode(); this.hideAttackSpeedRules(); requestAnimationFrame(() => this.updateLibraryScrollbar()); }
  showPlaying({ hp, maxHp, score, elapsed, attackSpeed = 1, skills = [], level = null, goal = null, boss = false, environment = null, tutorial = false, modeLabel = null, countdown = null }) { this.hideAllScreens(); this.battleScreen.classList.remove("is-hidden"); this.gameOverScreen.classList.add("is-hidden"); this.hidePause(); this.tutorialBattleExitButton.classList.toggle("is-hidden", !tutorial); this.tutorialBattleExitButton.textContent = tutorial ? "完成训练" : "返回教程"; this.tutorialBattleHint?.classList.toggle("is-hidden", !tutorial); this.tutorialBattleHint?.classList.remove("is-complete"); this.updateHud({ hp, maxHp, score, elapsed, attackSpeed, level, goal, boss, environment, modeLabel }); this.updateSkills(skills); this.updateCountdown(countdown); }
  updateCountdown(seconds) { if (!this.battleCountdown || !this.battleCountdownValue) return; const active = Number.isFinite(seconds) && seconds > 0; this.battleCountdown.classList.toggle("is-hidden", !active); if (active) { this.battleCountdownValue.textContent = String(Math.max(1, Math.ceil(seconds))); this.battleCountdown.classList.remove("countdown-pulse"); void this.battleCountdown.offsetWidth; this.battleCountdown.classList.add("countdown-pulse"); } }
  showTutorialBattleHint(message, complete = false) { if (!this.tutorialBattleHint) return; this.tutorialBattleHint.textContent = message; this.tutorialBattleHint.classList.remove("is-hidden"); this.tutorialBattleHint.classList.toggle("is-complete", complete); }
  showPause() { this.pauseOverlay.classList.remove("is-hidden"); this.pauseConfirm.classList.add("is-hidden"); }
  hidePause() { this.pauseOverlay.classList.add("is-hidden"); this.pauseConfirm.classList.add("is-hidden"); }
  renderLevelGrid() { this.levelGrid.innerHTML = LEVELS.map((level) => `<button class="level-card ${level.boss ? "is-boss" : ""}" type="button" data-level="${level.number}"><b>${level.number}</b><span>${level.boss ? "BOSS" : "MISSION"}</span><small>${level.targetScore} PTS</small></button>`).join(""); }
  renderEncyclopedia() {
    const sections = getEncyclopediaSections();
    this.encyclopediaContent.innerHTML = sections.map((section) => `<section class="encyclopedia-section"><h3>${escapeHtml(section.title)}</h3><div class="encyclopedia-entries">${section.entries.map((entry, index) => `<article class="encyclopedia-entry ${entry.enemyVisual ? "has-enemy-visual" : ""}"><div class="encyclopedia-copy"><div><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.tag)}</small></div><p>${escapeHtml(entry.description)}</p>${entry.action ? `<button type="button" class="encyclopedia-drilldown" data-encyclopedia-action="${escapeHtml(entry.action)}">${escapeHtml(entry.meta)}</button>` : `<span>${escapeHtml(entry.meta)}</span>`}</div>${entry.enemyVisual ? `<canvas class="encyclopedia-enemy-canvas" width="64" height="64" data-enemy-entry="${section.title}-${index}"></canvas>` : ""}</article>`).join("")}</div></section>`).join("");
    this.encyclopediaContent.querySelectorAll("[data-encyclopedia-action]").forEach((button) => bindTap(button, () => { if (button.dataset.encyclopediaAction === "beyond-events") this.showBeyondEventArchive(); }));
    sections.forEach((section) => section.entries.forEach((entry, index) => {
      if (!entry.enemyVisual) return;
      paintEncyclopediaEnemy(this.encyclopediaContent.querySelector(`[data-enemy-entry="${section.title}-${index}"]`), entry.enemyVisual);
    }));
  }
  renderBeyondEventArchive() {
    if (!this.encyclopediaEventsContent) return;
    const entries = getBeyondEventArchiveEntries();
    this.encyclopediaEventsContent.innerHTML = `<section class="encyclopedia-section"><h3>事件目录 / ${entries.length}</h3><div class="encyclopedia-entries">${entries.map((entry) => `<article class="encyclopedia-entry"><div class="encyclopedia-copy"><div><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.tag)}</small></div><p>${escapeHtml(entry.description)}</p><span>${escapeHtml(entry.meta)}</span></div></article>`).join("")}</div></section>`;
  }
  hideModuleDetail() { this.detailModal.classList.add("is-hidden"); }

  showModuleDetail(module) {
    if (!module) return;
    paintModuleCanvas(this.detailIconCanvas, module, 56);
    this.detailType.textContent = `${typeLabels[module.type] ?? module.type} / ${rarityLabels[module.rarity] ?? module.rarity}`;
    this.detailName.textContent = module.name;
    this.detailDescription.textContent = module.description;
    const bounds = getFootprintBounds(module); const behavior = module.behavior ?? {}; const projectile = behavior.projectile ?? {};
    const rows = [["\u5360\u4f4d", `${bounds.width} x ${bounds.height}`], ["ID", module.id], ["\u8fde\u63a5\u7c7b\u578b", module.connection ?? "-"], ["\u6a21\u5757\u7c7b\u578b", module.slotTypes?.join(" / ") ?? module.type], ["\u5c5e\u6027", elementLabels[getModuleElement(module)] ?? "\u65e0\u5c5e\u6027"]];
    if (behavior.type) rows.push(["\u884c\u4e3a", behavior.type]);
    if (behavior.fireInterval) rows.push(["\u653b\u51fb\u95f4\u9694", `${behavior.fireInterval}s`]);
    if (behavior.damageInterval) rows.push(["\u6301\u7eed\u5224\u5b9a\u95f4\u9694", `${behavior.damageInterval}s`]);
    if (behavior.volley) rows.push(["\u4e00\u6b21\u53d1\u5c04", `${behavior.volley} \u679a`]);
    if (typeof projectile.damage === "number") rows.push(["\u4f24\u5bb3", typeof projectile.damageEnd === "number" ? `${projectile.damage} - ${projectile.damageEnd}` : `${projectile.damage}`]);
    if (typeof behavior.damage === "number") rows.push(["\u4f24\u5bb3", `${behavior.damage}`]);
    if (typeof projectile.speed === "number") rows.push(["\u5b50\u5f39\u901f\u5ea6", `${projectile.speed}`]);
    if (typeof projectile.radius === "number") rows.push(["\u5b50\u5f39\u5927\u5c0f", `${projectile.radius}`]);
    if (typeof projectile.life === "number") rows.push(["\u5b58\u5728\u65f6\u95f4", `${projectile.life}s`]);
    if (typeof projectile.growthRate === "number") rows.push(["\u6269\u5927\u901f\u7387", `${projectile.growthRate}`]);
    if (typeof projectile.chainLife === "number") rows.push(["\u95ea\u7535\u6301\u7eed", `${projectile.chainLife}s`]);
    if (typeof projectile.explosionRadius === "number" && projectile.explosionRadius > 0) rows.push(["\u7206\u70b8\u8303\u56f4", `${projectile.explosionRadius}`]);
    if (typeof projectile.explosionDamage === "number") rows.push(["\u7206\u70b8\u4f24\u5bb3", `${projectile.explosionDamage}`]);
    if (projectile.burn) rows.push(["\u707c\u70e7", `${projectile.burn.duration}s / \u6bcf\u79d2 ${Math.round(1 / projectile.burn.tickInterval)}\u6b21 / \u5171 ${projectile.burn.ticks}\u6b21 / \u6bcf\u6b21 ${projectile.burn.damage}`]);
    if (typeof projectile.chainRadius === "number" && projectile.chainRadius > 0) rows.push(["\u8fde\u9501\u8303\u56f4", `${projectile.chainRadius}`]);
    if (typeof projectile.homingDelay === "number" && projectile.homingDelay > 0) rows.push(["\u7d22\u654c\u5ef6\u8fdf", `${projectile.homingDelay}s`]);
    if (typeof projectile.homingTurnRate === "number") rows.push(["\u8ffd\u8e2a\u8f6c\u5411\u901f\u5ea6", `${projectile.homingTurnRate}`]);
    if (typeof behavior.spreadAngle === "number") rows.push(["\u5206\u6563\u89d2\u5ea6", `${behavior.spreadAngle}`]);
    if (typeof projectile.pierce === "boolean") rows.push(["\u7a7f\u900f", projectile.pierce ? "\u662f" : "\u5426"]);
    if (typeof projectile.bounce === "boolean") rows.push(["\u53cd\u5f39", projectile.bounce ? "\u662f" : "\u5426"]);
    if (typeof behavior.offset === "number") rows.push(["\u53d1\u5c04\u95f4\u8ddd", `${behavior.offset}`]);
    if (Array.isArray(behavior.angles)) rows.push(["\u5c04\u51fb\u89d2\u5ea6", `${behavior.angles.length} \u65b9\u5411`]);
    if (Array.isArray(behavior.stackedIntervals)) rows.push(["\u53e0\u52a0\u653b\u901f", behavior.stackedIntervals.map((value) => `${value}s`).join(" / ")]);
    if (module.skill) rows.push(["\u4e3b\u52a8\u6280\u80fd", `${module.skill.name} / \u51b7\u5374 ${module.skill.cooldown}s / \u6301\u7eed ${module.skill.duration}s`]);
    if (module.maxCount) rows.push(["\u88c5\u5907\u4e0a\u9650", `${module.maxCount}`]);
    if (typeof module.modifiers?.attackSpeed?.add === "number" && module.modifiers.attackSpeed.add !== 0) rows.push(["\u653b\u901f\u52a0\u6210", `+${Math.round(module.modifiers.attackSpeed.add * 100)}%`]);
    if (module.modifiers) rows.push(["\u5c5e\u6027\u4fee\u6539", Object.entries(module.modifiers).map(([key, value]) => `${key}: +${value.add ?? 0} x${value.multiply ?? 1}`).join(" / ")]);
    this.detailStats.innerHTML = rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
    this.detailModal.classList.remove("is-hidden");
  }

  renderModuleLibrary() {
    this.moduleLibrary.innerHTML = moduleGroups.map(([type, title, modules]) => `<section class="library-group" data-module-type="${type}"><div class="library-group-title"><span>${title}</span><small>\u62d6\u5165\u7f51\u683c</small></div><div class="library-cards">${modules.map((module) => `<button class="library-module" type="button" data-drag-module="${module.id}" title="\u70b9\u51fb\u67e5\u770b\u8be6\u60c5 / \u62d6\u52a8\u5230\u88c5\u914d\u533a"><canvas class="module-icon-canvas" width="36" height="36" data-icon-module="${module.id}" aria-hidden="true"></canvas><span class="library-module-copy"><strong>${escapeHtml(module.name)}</strong></span><span class="install-mark">+</span></button>`).join("")}</div></section>`).join(""); this.paintIcons(this.moduleLibrary); this.updateLibraryScrollbar();
  }

  updateLibraryScrollbar() {
    if (!this.moduleLibrary || !this.moduleLibraryScrollbar || !this.moduleLibraryScrollbarThumb) return;
    const viewport = this.moduleLibrary.clientHeight; const content = this.moduleLibrary.scrollHeight; const track = this.moduleLibraryScrollbar.clientHeight;
    const thumbHeight = Math.max(52, Math.min(track - 4, content > 0 ? track * viewport / content : track - 4));
    const scrollRange = Math.max(0, content - viewport); const travel = Math.max(0, track - thumbHeight - 4); const progress = scrollRange ? this.moduleLibrary.scrollTop / scrollRange : 0;
    this.moduleLibraryScrollbarThumb.style.height = `${thumbHeight}px`; this.moduleLibraryScrollbarThumb.style.transform = `translateY(${progress * travel}px)`;
  }
  beginLibraryScrollbarDrag(event) {
    event.preventDefault(); const rect = this.moduleLibraryScrollbar.getBoundingClientRect(); const thumbHeight = this.moduleLibraryScrollbarThumb.getBoundingClientRect().height; const offset = event.target === this.moduleLibraryScrollbarThumb ? event.clientY - this.moduleLibraryScrollbarThumb.getBoundingClientRect().top : thumbHeight / 2;
    this.libraryScrollbarDrag = { pointerId: event.pointerId, offset, rect, thumbHeight }; this.moduleLibraryScrollbar.setPointerCapture?.(event.pointerId); this.moveLibraryScrollbarDrag(event);
  }
  moveLibraryScrollbarDrag(event) {
    const drag = this.libraryScrollbarDrag; if (!drag || drag.pointerId !== event.pointerId) return; event.preventDefault(); const travel = Math.max(0, drag.rect.height - drag.thumbHeight - 4); const position = Math.max(0, Math.min(travel, event.clientY - drag.rect.top - drag.offset - 2)); const scrollRange = Math.max(0, this.moduleLibrary.scrollHeight - this.moduleLibrary.clientHeight); this.moduleLibrary.scrollTop = travel ? position / travel * scrollRange : 0;
  }
  endLibraryScrollbarDrag(event) { if (this.libraryScrollbarDrag?.pointerId === event.pointerId) { this.libraryScrollbarDrag = null; this.moduleLibraryScrollbar.releasePointerCapture?.(event.pointerId); } }

  renderAssembly() {
    const cols = ASSEMBLY_BOARD.columns; const rows = ASSEMBLY_BOARD.rows; const core = ASSEMBLY_BOARD.corePosition;
    const cells = Array.from({ length: cols * rows }, (_, index) => `<span class="board-cell" data-cell-x="${index % cols}" data-cell-y="${Math.floor(index / cols)}" aria-hidden="true"></span>`).join("");
    const placed = this.loadout.modules.map((entry) => { const bounds = getFootprintBounds(entry.module); return `<button class="placed-module placed-${entry.module.type}" type="button" data-instance-id="${entry.instanceId}" data-module-id="${entry.moduleId}" style="left:${((entry.x + bounds.minX) / cols) * 100}%;top:${((entry.y + bounds.minY) / rows) * 100}%;width:${(bounds.width / cols) * 100}%;height:${(bounds.height / rows) * 100}%" title="\u62d6\u52a8\u79fb\u52a8 / \u70b9\u51fb\u67e5\u770b\u8be6\u60c5"><canvas class="placed-icon-canvas" width="48" height="48" data-icon-module="${entry.moduleId}" aria-hidden="true"></canvas></button>`; }).join("");
    this.assemblyBoard.innerHTML = `<div class="board-grid-lines" aria-hidden="true"></div><div class="board-cells" aria-hidden="true">${cells}</div><div class="board-core" style="left:${(core.x / cols) * 100}%;top:${(core.y / rows) * 100}%;width:${100 / cols}%;height:${100 / rows}%"><canvas class="board-icon-canvas" width="28" height="28" data-icon-module="core-stellar" aria-hidden="true"></canvas></div>${placed}`; this.quickPreview = null; this.paintIcons(this.assemblyBoard); this.updatePreview();
  }
  paintIcons(root) { root.querySelectorAll("[data-icon-module]").forEach((canvas) => paintModuleCanvas(canvas, getModuleById(canvas.dataset.iconModule), canvas.width)); }

  beginDrag(moduleId, instanceId, event) { const module = getModuleById(moduleId); if (!module || this.dragState) return; event.preventDefault(); const original = instanceId ? this.assemblyBoard.querySelector(`[data-instance-id="${instanceId}"]`) : null; original?.classList.add("is-dragging"); const ghost = document.createElement("div"); ghost.className = "drag-ghost"; ghost.innerHTML = `<canvas class="ghost-icon" width="28" height="28"></canvas><strong>${escapeHtml(module.name)}</strong>`; document.body.appendChild(ghost); paintModuleCanvas(ghost.querySelector("canvas"), module, 28); const preview = document.createElement("div"); preview.className = `drag-preview placed-${module.type}`; preview.innerHTML = `<canvas class="placed-icon-canvas" width="48" height="48"></canvas>`; this.assemblyBoard.appendChild(preview); paintModuleCanvas(preview.querySelector("canvas"), module, 48); this.dragState = { moduleId, instanceId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, ghost, preview, original }; this.positionGhost(event); this.updateDragPreview(event); }
  moveDrag(event) { if (!this.dragState || event.pointerId !== this.dragState.pointerId) return; event.preventDefault(); if (Math.hypot(event.clientX - this.dragState.startX, event.clientY - this.dragState.startY) > 6) this.dragState.moved = true; this.positionGhost(event); this.updateDragPreview(event); }
  positionGhost(event) { if (this.dragState?.ghost) { this.dragState.ghost.style.left = `${event.clientX + 14}px`; this.dragState.ghost.style.top = `${event.clientY + 14}px`; } }
  updateDragPreview(event) { const state = this.dragState; if (!state) return; const rect = this.assemblyBoard.getBoundingClientRect(); const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom; this.assemblyBoard.querySelectorAll(".placed-module").forEach((node) => node.classList.remove("at-risk")); if (!inside) { state.preview.classList.remove("is-visible"); return; } const x = Math.max(0, Math.min(ASSEMBLY_BOARD.columns - 1, Math.floor((event.clientX - rect.left) / (rect.width / ASSEMBLY_BOARD.columns)))); const y = Math.max(0, Math.min(ASSEMBLY_BOARD.rows - 1, Math.floor((event.clientY - rect.top) / (rect.height / ASSEMBLY_BOARD.rows)))); const module = getModuleById(state.moduleId); const candidate = this.buildCandidate(module, x, y, state.instanceId); const staticValid = validateGeometry(candidate, { requireConnected: false }).valid; const repair = staticValid ? pruneDisconnected(candidate) : { removed: [] }; const bounds = getFootprintBounds(module); const removedIds = new Set(repair.removed.map((entry) => entry.instanceId)); this.assemblyBoard.querySelectorAll(".placed-module").forEach((node) => { if (removedIds.has(node.dataset.instanceId)) node.classList.add("at-risk"); }); state.preview.style.left = `${((x + bounds.minX) / ASSEMBLY_BOARD.columns) * 100}%`; state.preview.style.top = `${((y + bounds.minY) / ASSEMBLY_BOARD.rows) * 100}%`; state.preview.style.width = `${(bounds.width / ASSEMBLY_BOARD.columns) * 100}%`; state.preview.style.height = `${(bounds.height / ASSEMBLY_BOARD.rows) * 100}%`; state.preview.classList.add("is-visible"); state.preview.classList.toggle("preview-valid", staticValid && repair.removed.length === 0); state.preview.classList.toggle("preview-impact", staticValid && repair.removed.length > 0); state.preview.classList.toggle("preview-invalid", !staticValid); }
  endDrag(event) { const state = this.dragState; if (!state || event.pointerId !== state.pointerId) return; const rect = this.assemblyBoard.getBoundingClientRect(); const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom; if (inside && state.instanceId && !state.moved) this.showModuleDetail(getModuleById(state.moduleId)); else if (inside) { const x = Math.max(0, Math.min(ASSEMBLY_BOARD.columns - 1, Math.floor((event.clientX - rect.left) / (rect.width / ASSEMBLY_BOARD.columns)))); const y = Math.max(0, Math.min(ASSEMBLY_BOARD.rows - 1, Math.floor((event.clientY - rect.top) / (rect.height / ASSEMBLY_BOARD.rows)))); this.placeModule(getModuleById(state.moduleId), x, y, state.instanceId); } this.suppressClick = state.moved; setTimeout(() => { this.suppressClick = false; }, 0); state.original?.classList.remove("is-dragging"); state.ghost?.remove(); state.preview?.remove(); this.dragState = null; }
  buildCandidate(module, x, y, instanceId = null) { const kept = this.loadout.modules.filter((entry) => entry.instanceId !== instanceId); const old = this.loadout.modules.find((entry) => entry.instanceId === instanceId); const entry = instanceId ? { ...old, x, y } : { instanceId: `module-${Date.now()}-${this.instanceCounter++}`, moduleId: module.id, module, x, y, rotation: 0 }; return { ...this.loadout, modules: [...kept, entry] }; }
  placeModule(module, x, y, instanceId = null) { if (!module) return false; const candidate = this.buildCandidate(module, x, y, instanceId); if (!validateGeometry(candidate, { requireConnected: false }).valid) return false; if (countSkillModules(candidate) > MAX_SKILL_MODULES) { this.setStatus(`技能模块最多装配 ${MAX_SKILL_MODULES} 个`); return false; } if (!instanceId && module.maxCount && this.loadout.modules.filter(({ module: current }) => current?.id === module.id).length >= module.maxCount) return false; this.pushHistory(); const repaired = pruneDisconnected(candidate); this.loadout = repaired.loadout; this.renderAssembly(); return repaired.loadout.modules.some((entry) => entry.instanceId === candidate.modules[candidate.modules.length - 1]?.instanceId); }
  getBoardWorld() { return this.assemblyBoard?.querySelector(".assembly-board-world"); }
  clampBoardOffset(offsetX, offsetY, scale = this.boardView.scale) {
    const board = this.assemblyBoard;
    const boardWidth = board?.clientWidth ?? 0;
    const boardHeight = board?.clientHeight ?? boardWidth;
    const worldWidth = boardWidth * scale;
    const worldHeight = boardHeight * scale;
    // Keep the pan bounds symmetric when the world is smaller. When zoomed in,
    // allow the full range in both directions instead of anchoring it at (0, 0).
    const horizontalMargin = Math.abs(boardWidth - worldWidth) / 2;
    const verticalMargin = Math.abs(boardHeight - worldHeight) / 2;
    const minX = worldWidth >= boardWidth ? boardWidth - worldWidth : -horizontalMargin;
    const maxX = worldWidth >= boardWidth ? 0 : horizontalMargin;
    const minY = worldHeight >= boardHeight ? boardHeight - worldHeight : -verticalMargin;
    const maxY = worldHeight >= boardHeight ? 0 : verticalMargin;
    return {
      offsetX: Math.min(maxX, Math.max(minX, offsetX)),
      offsetY: Math.min(maxY, Math.max(minY, offsetY)),
    };
  }
  applyBoardView() {
    const world = this.getBoardWorld(); if (!world) return; const view = this.boardView; world.style.transform = `translate3d(${view.offsetX}px, ${view.offsetY}px, 0) scale(${view.scale})`; const label = document.querySelector("[data-board-view-label]"); if (label) label.textContent = `${Math.round(view.scale * 100)}%`; const zoomOut = document.querySelector('[data-board-view="zoom-out"]'); const zoomIn = document.querySelector('[data-board-view="zoom-in"]'); if (zoomOut) zoomOut.disabled = view.scale <= 1; if (zoomIn) zoomIn.disabled = view.scale >= 2.8;
  }
  setBoardView(scale, offsetX = this.boardView.offsetX, offsetY = this.boardView.offsetY) {
    const nextScale = Math.max(1, Math.min(2.8, scale)); const clamped = this.clampBoardOffset(offsetX, offsetY, nextScale); this.boardView = { scale: nextScale, ...clamped }; this.applyBoardView();
  }
  zoomBoardAt(factor, clientX = null, clientY = null) {
    const rect = this.assemblyBoard.getBoundingClientRect(); const centerX = clientX == null ? rect.width / 2 : clientX - rect.left; const centerY = clientY == null ? rect.height / 2 : clientY - rect.top; const nextScale = Math.max(1, Math.min(2.8, this.boardView.scale * factor)); const worldX = (centerX - this.boardView.offsetX) / this.boardView.scale; const worldY = (centerY - this.boardView.offsetY) / this.boardView.scale; this.setBoardView(nextScale, centerX - worldX * nextScale, centerY - worldY * nextScale);
  }
  handleBoardViewAction(action) { if (action === "zoom-in") this.zoomBoardAt(1.18); else if (action === "zoom-out") this.zoomBoardAt(1 / 1.18); else if (action === "reset") this.setBoardView(1, 0, 0); }
  getGridPosition(event) { const rect = this.assemblyBoard.getBoundingClientRect(); if (!rect.width || !rect.height) return null; const localX = (event.clientX - rect.left - this.boardView.offsetX) / this.boardView.scale; const localY = (event.clientY - rect.top - this.boardView.offsetY) / this.boardView.scale; return { x: Math.max(0, Math.min(ASSEMBLY_BOARD.columns - 1, Math.floor(localX / (rect.width / ASSEMBLY_BOARD.columns)))), y: Math.max(0, Math.min(ASSEMBLY_BOARD.rows - 1, Math.floor(localY / (rect.height / ASSEMBLY_BOARD.rows)))) }; }
  beginBoardGesture(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return; this.boardPointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); this.assemblyBoard.setPointerCapture?.(event.pointerId); if (this.boardPointers.size >= 2) { const points = [...this.boardPointers.values()]; const center = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }; this.boardGesture = { mode: "pinch", startDistance: Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)), startScale: this.boardView.scale, startCenter: center, startOffsetX: this.boardView.offsetX, startOffsetY: this.boardView.offsetY, moved: true }; return; }
    this.boardGesture = { mode: "pan", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startOffsetX: this.boardView.offsetX, startOffsetY: this.boardView.offsetY, moved: false };
  }
  moveBoardGesture(event) {
    if (!this.boardPointers.has(event.pointerId)) return false; this.boardPointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); const gesture = this.boardGesture; if (!gesture) return false; event.preventDefault(); if (gesture.mode === "pinch" && this.boardPointers.size >= 2) { const points = [...this.boardPointers.values()]; const center = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }; const distance = Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)); const rect = this.assemblyBoard.getBoundingClientRect(); const startCenterX = gesture.startCenter.x - rect.left; const startCenterY = gesture.startCenter.y - rect.top; const worldX = (startCenterX - gesture.startOffsetX) / gesture.startScale; const worldY = (startCenterY - gesture.startOffsetY) / gesture.startScale; const nextScale = Math.max(1, Math.min(2.8, gesture.startScale * distance / gesture.startDistance)); this.setBoardView(nextScale, center.x - rect.left - worldX * nextScale, center.y - rect.top - worldY * nextScale); return true; }
    if (gesture.mode !== "pan" || gesture.pointerId !== event.pointerId) return true; const dx = event.clientX - gesture.startX; const dy = event.clientY - gesture.startY; if (Math.hypot(dx, dy) > 6) gesture.moved = true; this.setBoardView(this.boardView.scale, gesture.startOffsetX + dx, gesture.startOffsetY + dy); return true;
  }
  endBoardGesture(event) {
    if (!this.boardPointers.has(event.pointerId)) return false; this.boardPointers.delete(event.pointerId); const gesture = this.boardGesture; if (gesture?.mode === "pinch") { if (this.boardPointers.size === 1) { const point = [...this.boardPointers.entries()][0]; this.boardGesture = { mode: "pan", pointerId: point[0], startX: point[1].x, startY: point[1].y, startOffsetX: this.boardView.offsetX, startOffsetY: this.boardView.offsetY, moved: true }; } else this.boardGesture = null; return false; } if (!gesture || gesture.pointerId !== event.pointerId) return false; const tap = !gesture.moved; this.suppressClick = gesture.moved; this.boardGesture = null; if (this.assemblyBoard.hasPointerCapture?.(event.pointerId)) this.assemblyBoard.releasePointerCapture(event.pointerId); setTimeout(() => { this.suppressClick = false; }, 0); return tap;
  }
  cancelBoardGesture(event) {
    if (event?.pointerId != null) this.boardPointers.delete(event.pointerId);
    this.boardPointers.clear();
    this.boardGesture = null;
    const pointerId = event?.pointerId;
    if (pointerId != null && this.assemblyBoard.hasPointerCapture?.(pointerId)) {
      this.assemblyBoard.releasePointerCapture(pointerId);
    }
    this.suppressClick = true;
    setTimeout(() => { this.suppressClick = false; }, 0);
  }
  renderAssembly() {
    const cols = ASSEMBLY_BOARD.columns; const rows = ASSEMBLY_BOARD.rows; const core = ASSEMBLY_BOARD.corePosition;
    const cells = Array.from({ length: cols * rows }, (_, index) => `<span class="board-cell" data-cell-x="${index % cols}" data-cell-y="${Math.floor(index / cols)}" aria-hidden="true"></span>`).join("");
    const placed = this.loadout.modules.map((entry) => { const bounds = getFootprintBounds(entry.module); return `<button class="placed-module placed-${entry.module.type}" type="button" data-instance-id="${entry.instanceId}" data-module-id="${entry.moduleId}" style="left:${((entry.x + bounds.minX) / cols) * 100}%;top:${((entry.y + bounds.minY) / rows) * 100}%;width:${(bounds.width / cols) * 100}%;height:${(bounds.height / rows) * 100}%" title="拖动移动 / 点击查看详情"><canvas class="placed-icon-canvas" width="48" height="48" data-icon-module="${entry.moduleId}" aria-hidden="true"></canvas></button>`; }).join("");
    const controls = `<div class="assembly-view-controls" aria-label="网格视图控制"><button type="button" data-board-view="zoom-out" aria-label="缩小">−</button><span data-board-view-label>100%</span><button type="button" data-board-view="zoom-in" aria-label="放大">+</button><button type="button" data-board-view="reset" aria-label="重置视图">↺</button></div>`;
    const world = `<div class="assembly-board-world"><div class="board-grid-lines" aria-hidden="true"></div><div class="board-cells" aria-hidden="true">${cells}</div><div class="board-core" style="left:${(core.x / cols) * 100}%;top:${(core.y / rows) * 100}%;width:${100 / cols}%;height:${100 / rows}%"><canvas class="board-icon-canvas" width="28" height="28" data-icon-module="core-stellar" aria-hidden="true"></canvas></div>${placed}</div>`;
    this.assemblyBoard.innerHTML = `${controls}${world}`; this.quickPreview = null; this.paintIcons(this.assemblyBoard); this.applyBoardView(); this.updatePreview();
  }
  handleQuickAssemblyClick(event) { if (!this.quickAssemblyEnabled || !this.quickAssemblyModuleId || this.dragState) return; const position = this.getGridPosition(event); if (!position) return; const module = getModuleById(this.quickAssemblyModuleId); const installed = this.placeModule(module, position.x, position.y); this.setStatus(installed ? `已装配${module.name}，可继续点击网络` : "此位置无法装配，请选择相邻空位"); }
  finishQuickAssemblyPointer(event) {
    const pointer = this.quickAssemblyPointer;
    if (!pointer || pointer.pointerId !== event.pointerId) return false;
    this.quickAssemblyPointer = null;
    if (!this.quickAssemblyEnabled || pointer.moved || this.dragState) return false;
    const rect = this.assemblyBoard.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) return false;
    event.preventDefault();
    this.suppressClick = true;
    setTimeout(() => { this.suppressClick = false; }, 0);
    if (isTouchLikePointer(event)) markTouchHandled(this.assemblyBoard);
    this.handleQuickAssemblyClick(event);
    return true;
  }
  updateQuickAssemblyPreview(event) { if (!this.quickAssemblyEnabled || !this.quickAssemblyModuleId || this.dragState) { this.hideQuickAssemblyPreview(); return; } const rect = this.assemblyBoard.getBoundingClientRect(); if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) { this.hideQuickAssemblyPreview(); return; } const module = getModuleById(this.quickAssemblyModuleId); if (!module) return; if (!this.quickPreview || !this.quickPreview.isConnected) { this.quickPreview = document.createElement("div"); this.quickPreview.className = `drag-preview placed-${module.type}`; this.quickPreview.innerHTML = `<canvas class="placed-icon-canvas" width="48" height="48"></canvas>`; this.getBoardWorld().appendChild(this.quickPreview); } if (this.quickPreview.dataset.moduleId !== module.id) { this.quickPreview.dataset.moduleId = module.id; this.quickPreview.className = `drag-preview placed-${module.type}`; paintModuleCanvas(this.quickPreview.querySelector("canvas"), module, 48); } const position = this.getGridPosition(event); if (!position) return; const { x, y } = position; const candidate = this.buildCandidate(module, x, y); const staticValid = validateGeometry(candidate, { requireConnected: false }).valid; const repair = staticValid ? pruneDisconnected(candidate) : { removed: [] }; const bounds = getFootprintBounds(module); const removedIds = new Set(repair.removed.map((entry) => entry.instanceId)); this.assemblyBoard.querySelectorAll(".placed-module").forEach((node) => node.classList.toggle("at-risk", removedIds.has(node.dataset.instanceId))); this.quickPreview.style.left = `${((x + bounds.minX) / ASSEMBLY_BOARD.columns) * 100}%`; this.quickPreview.style.top = `${((y + bounds.minY) / ASSEMBLY_BOARD.rows) * 100}%`; this.quickPreview.style.width = `${(bounds.width / ASSEMBLY_BOARD.columns) * 100}%`; this.quickPreview.style.height = `${(bounds.height / ASSEMBLY_BOARD.rows) * 100}%`; this.quickPreview.classList.add("is-visible"); this.quickPreview.classList.toggle("preview-valid", staticValid && repair.removed.length === 0); this.quickPreview.classList.toggle("preview-impact", staticValid && repair.removed.length > 0); this.quickPreview.classList.toggle("preview-invalid", !staticValid); }
  beginDrag(moduleId, instanceId, event) { const module = getModuleById(moduleId); if (!module || this.dragState) return; event.preventDefault(); const original = instanceId ? this.assemblyBoard.querySelector(`[data-instance-id="${instanceId}"]`) : null; original?.classList.add("is-dragging"); const ghost = document.createElement("div"); ghost.className = "drag-ghost"; ghost.innerHTML = `<canvas class="ghost-icon" width="28" height="28"></canvas><strong>${escapeHtml(module.name)}</strong>`; document.body.appendChild(ghost); paintModuleCanvas(ghost.querySelector("canvas"), module, 28); const preview = document.createElement("div"); preview.className = `drag-preview placed-${module.type}`; preview.innerHTML = `<canvas class="placed-icon-canvas" width="48" height="48"></canvas>`; this.getBoardWorld().appendChild(preview); paintModuleCanvas(preview.querySelector("canvas"), module, 48); this.dragState = { moduleId, instanceId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, ghost, preview, original }; this.positionGhost(event); this.updateDragPreview(event); }
  updateDragPreview(event) { const state = this.dragState; if (!state) return; const rect = this.assemblyBoard.getBoundingClientRect(); const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom; this.assemblyBoard.querySelectorAll(".placed-module").forEach((node) => node.classList.remove("at-risk")); if (!inside) { state.preview.classList.remove("is-visible"); return; } const position = this.getGridPosition(event); if (!position) return; const { x, y } = position; const module = getModuleById(state.moduleId); const candidate = this.buildCandidate(module, x, y, state.instanceId); const staticValid = validateGeometry(candidate, { requireConnected: false }).valid; const repair = staticValid ? pruneDisconnected(candidate) : { removed: [] }; const bounds = getFootprintBounds(module); const removedIds = new Set(repair.removed.map((entry) => entry.instanceId)); this.assemblyBoard.querySelectorAll(".placed-module").forEach((node) => { if (removedIds.has(node.dataset.instanceId)) node.classList.add("at-risk"); }); state.preview.style.left = `${((x + bounds.minX) / ASSEMBLY_BOARD.columns) * 100}%`; state.preview.style.top = `${((y + bounds.minY) / ASSEMBLY_BOARD.rows) * 100}%`; state.preview.style.width = `${(bounds.width / ASSEMBLY_BOARD.columns) * 100}%`; state.preview.style.height = `${(bounds.height / ASSEMBLY_BOARD.rows) * 100}%`; state.preview.classList.add("is-visible"); state.preview.classList.toggle("preview-valid", staticValid && repair.removed.length === 0); state.preview.classList.toggle("preview-impact", staticValid && repair.removed.length > 0); state.preview.classList.toggle("preview-invalid", !staticValid); }
  endDrag(event) { const state = this.dragState; if (!state || event.pointerId !== state.pointerId) return; const rect = this.assemblyBoard.getBoundingClientRect(); const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom; if (inside && state.instanceId && !state.moved) this.showModuleDetail(getModuleById(state.moduleId)); else if (inside) { const position = this.getGridPosition(event); if (position) this.placeModule(getModuleById(state.moduleId), position.x, position.y, state.instanceId); } this.suppressClick = state.moved; setTimeout(() => { this.suppressClick = false; }, 0); state.original?.classList.remove("is-dragging"); state.ghost?.remove(); state.preview?.remove(); this.dragState = null; }
  renderAssembly() {
    const cols = ASSEMBLY_BOARD.columns; const rows = ASSEMBLY_BOARD.rows; const core = ASSEMBLY_BOARD.corePosition;
    const cells = Array.from({ length: cols * rows }, (_, index) => `<span class="board-cell" data-cell-x="${index % cols}" data-cell-y="${Math.floor(index / cols)}" aria-hidden="true"></span>`).join("");
    const placed = this.loadout.modules.map((entry) => { const bounds = getFootprintBounds(entry.module); return `<button class="placed-module placed-${entry.module.type}" type="button" data-instance-id="${entry.instanceId}" data-module-id="${entry.moduleId}" style="left:${((entry.x + bounds.minX) / cols) * 100}%;top:${((entry.y + bounds.minY) / rows) * 100}%;width:${(bounds.width / cols) * 100}%;height:${(bounds.height / rows) * 100}%"><canvas class="placed-icon-canvas" width="48" height="48" data-icon-module="${entry.moduleId}" aria-hidden="true"></canvas></button>`; }).join("");
    const world = `<div class="assembly-board-world"><div class="board-grid-lines" aria-hidden="true"></div><div class="board-cells" aria-hidden="true">${cells}</div><div class="board-core" style="left:${(core.x / cols) * 100}%;top:${(core.y / rows) * 100}%;width:${100 / cols}%;height:${100 / rows}%"><canvas class="board-icon-canvas" width="28" height="28" data-icon-module="core-stellar" aria-hidden="true"></canvas></div>${placed}</div>`;
    this.assemblyBoard.innerHTML = world; this.quickPreview = null; this.paintIcons(this.assemblyBoard); this.applyBoardView(); this.updatePreview(); if (!this.synergyConfigModal?.classList.contains("is-hidden")) this.renderSynergyConfig();
  }
  updatePreview() { const stats = calculateFinalStats(PLAYER_BASE_STATS, getInstalledModules(this.loadout)); const output = this.previewAttackSpeedValue ?? document.querySelector("#preview-attack-speed-value"); if (output) output.textContent = `${Math.round(stats.attackSpeed * 100)}%`; }
  updateHud({ hp, maxHp, score, elapsed, attackSpeed = 1, level = null, goal = null, boss = false, environment = null, modeLabel = null }) { this.healthValue.textContent = `${hp} / ${maxHp}`; if (this.scoreValue) this.scoreValue.textContent = scoreText(score); if (this.battleScoreCurrent) this.battleScoreCurrent.textContent = scoreText(score); if (this.battleScoreTarget) this.battleScoreTarget.textContent = typeof goal === "number" && Number.isFinite(goal) ? scoreText(goal) : "∞"; this.timeValue.textContent = timeText(elapsed); if (this.attackSpeedValue) this.attackSpeedValue.textContent = `${Math.round(attackSpeed * 100)}%`; if (this.levelValue) this.levelValue.textContent = modeLabel ?? (level ? `${level}${boss ? " BOSS" : ` / ${goal ?? "-"}`}` : "ENDLESS"); this.updateEnvironmentHud(environment); }
  updateEnvironmentHud(environment) {
    const definition = environment?.definition;
    if (!definition) { this.environmentButton?.classList.add("is-hidden"); this.hideEnvironmentDetail(); return; }
    this.environmentButton?.classList.remove("is-hidden"); if (this.environmentName) this.environmentName.textContent = definition.name; if (this.environmentRemaining) this.environmentRemaining.textContent = `${Math.max(0, environment.remaining).toFixed(1)}s`;
    if (this.environmentDetailName) this.environmentDetailName.textContent = definition.name; if (this.environmentDetailDescription) this.environmentDetailDescription.textContent = definition.description;
    const rows = []; const labels = { player: { attackSpeed: "自动攻击速度", moveSpeed: "移动速度" }, enemy: { speed: "移动速度", shootInterval: "射击间隔", projectileSpeed: "子弹速度" } };
    for (const side of ["player", "enemy"]) for (const [key, value] of Object.entries(definition[side] ?? {})) { if (typeof value !== "number" || value === 1) continue; const percent = Math.round(value * 100); const suffix = key === "shootInterval" ? "%（间隔）" : "%"; rows.push(`<div><span>${side === "player" ? "玩家" : "敌机"} · ${labels[side][key] ?? key}</span><strong>${percent}${suffix}</strong></div>`); }
    if (this.environmentDetailEffects) this.environmentDetailEffects.innerHTML = rows.join("") || "<div><span>效果</span><strong>无额外变化</strong></div>";
  }
  showEnvironmentDetail() { if (this.environmentButton?.classList.contains("is-hidden")) return; this.environmentPauseOwned = this.onEnvironmentPause?.() === true; this.environmentDetailModal?.classList.remove("is-hidden"); }
  hideEnvironmentDetail() { this.environmentDetailModal?.classList.add("is-hidden"); if (this.environmentPauseOwned) { this.environmentPauseOwned = false; this.onEnvironmentResume?.(); } }
  updateSkills(skills = []) {
    if (this.skillPanel.children.length !== skills.length) {
      this.skillPanel.innerHTML = skills.map((skill, index) => `<button class="skill-button" type="button" data-skill-index="${index}"><b>${index + 1}</b><span>${escapeHtml(skill.name)}</span><small></small></button>`).join("");
    }
    skills.forEach((skill, index) => {
      const button = this.skillPanel.querySelector(`[data-skill-index="${index}"]`);
      if (!button) return;
      const cooldown = Math.max(0, skill.cooldownRemaining ?? 0);
      const cooling = cooldown > 0;
      button.classList.toggle("is-cooling", cooling);
      button.disabled = cooling;
      button.querySelector("small").textContent = cooling ? `${cooldown.toFixed(1)}s` : "\u5c31\u7eea";
    });
  }
  showGameOver({ score, elapsed, victory = false, level = null, mode = "endless" }) { this.battleScreen.classList.remove("is-hidden"); this.gameOverScreen.classList.remove("is-hidden"); this.finalScoreValue.textContent = scoreText(score); this.timeValue.textContent = timeText(elapsed); const dodge = mode === "dodge"; this.gameOverEyebrow.textContent = victory ? "MISSION CLEAR" : dodge ? "DODGE COMPLETE" : "SIGNAL LOST"; this.gameOverTitle.textContent = victory ? "关卡完成" : dodge ? "躲避结束" : "任务结束"; this.gameOverMessage.textContent = victory ? `第 ${level} 关已完成，准备迎接下一场战斗。` : dodge ? "弹幕躲避训练结束，继续挑战更高难度吧。" : "你的战机已失去战斗能力。"; this.nextLevelButton.textContent = "下一关"; this.nextLevelButton.classList.toggle("is-hidden", !victory || !level || level >= 50); this.returnLevelSelectButton.classList.remove("is-hidden"); this.gameOverReturnTarget = mode === "endless" || dodge ? "mode" : "level"; this.returnLevelSelectButton.textContent = this.gameOverReturnTarget === "mode" ? "返回模式选择" : "返回选关"; }
  showBeyondStageComplete({ score, elapsed, node, rewards = [], chapterComplete = false, chapter = 1, totalChapters = 1 }) { this.battleScreen.classList.remove("is-hidden"); this.gameOverScreen.classList.remove("is-hidden"); this.finalScoreValue.textContent = scoreText(score); this.timeValue.textContent = timeText(elapsed); this.gameOverEyebrow.textContent = chapterComplete ? "CHAPTER CLEAR" : "SECTOR CLEAR"; this.gameOverTitle.textContent = chapterComplete ? "章节完成" : "关卡完成"; const nodeName = chapterComplete ? `第 ${chapter} 章完成，下一章 ${chapter + 1} / ${totalChapters}` : node?.type === "elite" ? "精英战斗" : node?.type === "boss" ? "首领战斗" : "普通战斗"; this.gameOverMessage.textContent = nodeName; this.nextLevelButton.textContent = chapterComplete ? `进入第 ${chapter + 1} 章` : "继续航程"; this.nextLevelButton.classList.remove("is-hidden"); this.returnLevelSelectButton.classList.add("is-hidden"); this.gameOverReturnTarget = "beyond"; }
}
