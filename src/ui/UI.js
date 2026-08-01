import { ASSEMBLY_BOARD, MODULE_CONFIG, createLoadout, getFootprintBounds, getInstalledModules, getModuleById } from "../config/module-config.js";
import { MAX_SKILL_MODULES, calculateFinalStats, countSkillModules, pruneDisconnected, validateGeometry, validateLoadout } from "../systems/ModuleSystem.js";
import { decodeLoadoutCode, encodeLoadoutCode } from "../systems/LoadoutCodec.js";
import { paintModuleCanvas } from "../rendering/ModuleRenderer.js";
import { LEVELS } from "../config/level-config.js";
import { PLAYER_BASE_STATS } from "../config/game-config.js";

const scoreText = (value) => String(Math.max(0, Math.floor(value))).padStart(6, "0");
const timeText = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const escapeHtml = (value) => String(value).replace(/[&<>\x27"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\x27": "&#39;", '"': "&quot;" }[char]));
const moduleGroups = [["weapon", "\u6b66\u5668\u6a21\u5757", MODULE_CONFIG.weapons], ["special", "\u7279\u6b8a\u6a21\u5757", MODULE_CONFIG.specials]];
const typeLabels = { core: "\u6838\u5fc3\u6a21\u5757", weapon: "\u6b66\u5668\u6a21\u5757", special: "\u7279\u6b8a\u6a21\u5757" };
const rarityLabels = { common: "\u666e\u901a", uncommon: "\u975e\u51e1", rare: "\u7a00\u6709", epic: "\u53f2\u8bd7", legendary: "\u4f20\u8bf4" };

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
    const sameButton = originalButton && clickedButton && (originalButton === clickedButton || originalButton.contains(clickedButton) || clickedButton.contains(originalButton));
    if (event.detail !== 0 && !sameButton) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
};
installTouchReleaseGuard();

const bindTap = (element, handler) => {
  if (!element) return;
  element.addEventListener("click", (event) => {
    // Native click is fired after release for mouse, touch and keyboard.
    if (!element.disabled) handler(event);
  });
};

export class UI {
  constructor() {
    this.deleteZone = document.querySelector("#delete-zone");
    this.settingsButton = document.querySelector("#settings-button"); this.settingsModal = document.querySelector("#settings-modal"); this.settingsClose = document.querySelector("#settings-close"); this.damageNumberToggle = document.querySelector("#damage-number-toggle"); this.vibrationToggle = document.querySelector("#vibration-toggle"); this.soundToggle = document.querySelector("#sound-toggle");
    queueMicrotask(() => this.enableDeleteZone());
    for (const id of ["main-menu-screen", "mode-screen", "level-select-screen", "builder-screen", "battle-screen", "open-builder-button", "menu-battle-button", "mode-back-button", "endless-mode-button", "level-mode-button", "level-back-button", "level-grid", "builder-save-button", "battle-menu-button", "next-level-button", "return-level-select-button", "pause-overlay", "pause-continue-button", "pause-return-button", "pause-confirm", "pause-cancel-button", "pause-confirm-button", "clear-loadout", "quick-assembly-toggle", "builder-undo-button", "loadout-code-button", "loadout-code-modal", "loadout-code-close", "loadout-code-input", "loadout-code-message", "loadout-code-export", "loadout-code-import", "attack-speed-modal", "attack-speed-close", "module-detail-modal", "module-detail-close", "detail-icon-canvas", "detail-type", "detail-name", "detail-description", "detail-stats", "assembly-board", "module-library", "module-library-scrollbar", "module-library-scrollbar-thumb", "skill-panel", "health-value", "score-value", "level-value", "time-value", "final-score-value", "loadout-status", "preview-attack-speed", "game-over-screen", "game-over-title", "game-over-eyebrow", "game-over-message"]) this[id.replaceAll("-", "_")] = document.querySelector(`#${id}`);
    this.menuScreen = this.main_menu_screen; this.modeScreen = this.mode_screen; this.levelSelectScreen = this.level_select_screen; this.builderScreen = this.builder_screen; this.battleScreen = this.battle_screen;
    this.openBuilderButton = this.open_builder_button; this.menuBattleButton = this.menu_battle_button; this.modeBackButton = this.mode_back_button; this.endlessModeButton = this.endless_mode_button; this.levelModeButton = this.level_mode_button; this.levelBackButton = this.level_back_button; this.levelGrid = this.level_grid; this.builderSaveButton = this.builder_save_button; this.battleMenuButton = this.battle_menu_button; this.nextLevelButton = this.next_level_button; this.returnLevelSelectButton = this.return_level_select_button; this.pauseOverlay = this.pause_overlay; this.pauseContinueButton = this.pause_continue_button; this.pauseReturnButton = this.pause_return_button; this.pauseConfirm = this.pause_confirm; this.pauseCancelButton = this.pause_cancel_button; this.pauseConfirmButton = this.pause_confirm_button; this.clearButton = this.clear_loadout; this.quickAssemblyToggle = this.quick_assembly_toggle; this.builderUndoButton = this.builder_undo_button; this.loadoutCodeButton = this.loadout_code_button; this.loadoutCodeModal = this.loadout_code_modal; this.loadoutCodeClose = this.loadout_code_close; this.loadoutCodeInput = this.loadout_code_input; this.loadoutCodeMessage = this.loadout_code_message; this.loadoutCodeExport = this.loadout_code_export; this.loadoutCodeImport = this.loadout_code_import; this.attackSpeedModal = this.attack_speed_modal; this.attackSpeedClose = this.attack_speed_close; this.detailModal = this.module_detail_modal; this.detailClose = this.module_detail_close; this.detailIconCanvas = this.detail_icon_canvas; this.detailType = this.detail_type; this.detailName = this.detail_name; this.detailDescription = this.detail_description; this.detailStats = this.detail_stats; this.assemblyBoard = this.assembly_board; this.moduleLibrary = this.module_library; this.moduleLibraryScrollbar = this.module_library_scrollbar; this.moduleLibraryScrollbarThumb = this.module_library_scrollbar_thumb; this.skillPanel = this.skill_panel; this.healthValue = this.health_value; this.scoreValue = this.score_value; this.levelValue = this.level_value; this.timeValue = this.time_value; this.finalScoreValue = this.final_score_value; this.loadoutStatus = this.loadout_status; this.previewAttackSpeed = this.preview_attack_speed; this.gameOverScreen = this.game_over_screen; this.gameOverEyebrow = this.game_over_eyebrow; this.gameOverTitle = this.game_over_title; this.gameOverMessage = this.game_over_message;
    this.loadout = createLoadout(); this.history = []; this.dragState = null; this.suppressClick = false; this.instanceCounter = 1; this.selectedMode = "endless"; this.selectedLevel = 1; this.quickAssemblyEnabled = false; this.quickAssemblyModuleId = null;
    this.renderModuleLibrary(); this.renderAssembly(); this.renderLevelGrid(); this.showMenu();
    bindTap(this.settingsButton, () => this.settingsModal.classList.remove("is-hidden")); bindTap(this.settingsClose, () => this.settingsModal.classList.add("is-hidden")); this.settingsModal.addEventListener("click", (event) => { if (event.target === this.settingsModal) this.settingsModal.classList.add("is-hidden"); }); this.damageNumberToggle.addEventListener("change", () => this.onDamageNumbersChanged?.(this.damageNumberToggle.checked)); this.vibrationToggle.addEventListener("change", () => this.onVibrationChanged?.(this.vibrationToggle.checked)); this.soundToggle.addEventListener("change", () => this.onSoundChanged?.(this.soundToggle.checked));
    this.moduleLibrary.addEventListener("pointerdown", (event) => { const source = event.target.closest("[data-drag-module]"); if (source && !this.quickAssemblyEnabled) this.beginDrag(source.dataset.dragModule, null, event); });
    this.moduleLibrary.addEventListener("click", (event) => { if (this.suppressClick) return; const source = event.target.closest("[data-drag-module]"); if (!source) return; if (this.quickAssemblyEnabled) this.selectQuickAssemblyModule(source.dataset.dragModule); else this.showModuleDetail(getModuleById(source.dataset.dragModule)); });
    this.assemblyBoard.addEventListener("pointerdown", (event) => { if (this.quickAssemblyEnabled) { this.updateQuickAssemblyPreview(event); return; } const source = event.target.closest("[data-instance-id]"); if (source) this.beginDrag(source.dataset.moduleId, source.dataset.instanceId, event); });
    this.assemblyBoard.addEventListener("pointerenter", (event) => this.updateQuickAssemblyPreview(event));
    this.assemblyBoard.addEventListener("pointermove", (event) => this.updateQuickAssemblyPreview(event), { passive: true });
    this.assemblyBoard.addEventListener("pointerleave", () => this.hideQuickAssemblyPreview());
    this.assemblyBoard.addEventListener("click", (event) => this.handleQuickAssemblyClick(event));
    window.addEventListener("pointermove", (event) => this.moveDrag(event), { passive: false }); window.addEventListener("pointerup", (event) => this.endDrag(event)); window.addEventListener("pointercancel", (event) => this.endDrag(event));
    this.skillPanel.addEventListener("click", (event) => { const button = event.target.closest("[data-skill-index]"); if (button && !button.disabled) this.onSkill?.(Number(button.dataset.skillIndex)); });
    bindTap(this.clearButton, () => { this.pushHistory(); this.loadout = createLoadout({ modules: [] }); this.renderAssembly(); this.setStatus("\u88c5\u914d\u533a\u5df2\u6e05\u7a7a"); });
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

  bind({ onStart, onMenu, onPause, onResume, onSkill, onDamageNumbersChanged, onVibrationChanged, onSoundChanged, onNextLevel, onLevelSelect, onModeSelect }) {
    this.onStart = onStart; this.onMenu = onMenu; this.onPause = onPause; this.onResume = onResume; this.onSkill = onSkill; this.onDamageNumbersChanged = onDamageNumbersChanged; this.onVibrationChanged = onVibrationChanged; this.onSoundChanged = onSoundChanged; this.onNextLevel = onNextLevel; this.onLevelSelect = onLevelSelect; this.onModeSelect = onModeSelect;
    bindTap(this.openBuilderButton, () => this.showBuilder()); bindTap(this.menuBattleButton, () => this.showModeSelect()); bindTap(this.modeBackButton, () => this.showMenu()); bindTap(this.endlessModeButton, () => { this.selectedMode = "endless"; this.requestStart(); }); bindTap(this.levelModeButton, () => this.showLevelSelect()); bindTap(this.levelBackButton, () => this.showModeSelect());
    this.levelGrid.querySelectorAll("[data-level]").forEach((button) => bindTap(button, () => { this.selectedMode = "levels"; this.selectedLevel = Number(button.dataset.level); this.requestStart(); }));
    bindTap(this.builderSaveButton, () => this.saveBuild()); bindTap(this.quickAssemblyToggle, () => this.setQuickAssembly(!this.quickAssemblyEnabled)); bindTap(this.battleMenuButton, () => this.onPause?.()); bindTap(this.nextLevelButton, () => this.onNextLevel?.()); bindTap(this.returnLevelSelectButton, () => (this.gameOverReturnTarget === "mode" ? this.onModeSelect?.() : this.onLevelSelect?.()));
    bindTap(this.pauseContinueButton, () => this.onResume?.()); bindTap(this.pauseReturnButton, () => this.pauseConfirm.classList.remove("is-hidden")); bindTap(this.pauseCancelButton, () => this.pauseConfirm.classList.add("is-hidden")); bindTap(this.pauseConfirmButton, () => this.onMenu?.());
  }
  requestStart() { const result = validateLoadout(this.loadout); if (!result.valid) { this.showBuilder(); this.setStatus(result.reason); return; } this.onStart?.(this.getSelectedIds()); }
  saveBuild() { this.history = []; this.onMenu?.(); }
  openLoadoutCode() { try { this.loadoutCodeInput.value = encodeLoadoutCode(this.loadout); this.loadoutCodeMessage.textContent = `已生成 ${this.loadout.modules.length} 个模块的配置码`; this.loadoutCodeModal.classList.remove("is-hidden"); requestAnimationFrame(() => { this.loadoutCodeInput.focus(); this.loadoutCodeInput.select(); }); } catch (error) { this.setStatus(error instanceof Error ? error.message : "无法生成配置码"); } }
  hideLoadoutCode() { this.loadoutCodeModal?.classList.add("is-hidden"); }
  showAttackSpeedRules() { this.attackSpeedModal?.classList.remove("is-hidden"); }
  hideAttackSpeedRules() { this.attackSpeedModal?.classList.add("is-hidden"); }
  async copyLoadoutCode() { try { const code = encodeLoadoutCode(this.loadout); this.loadoutCodeInput.value = code; let copied = false; if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(code); copied = true; } if (!copied) { this.loadoutCodeInput.focus(); this.loadoutCodeInput.select(); try { copied = document.execCommand("copy"); } catch {} } this.loadoutCodeMessage.textContent = copied ? "配置码已复制" : "配置码已生成，可长按或全选复制"; } catch (error) { this.loadoutCodeMessage.textContent = error instanceof Error ? error.message : "无法复制配置码"; } }
  importLoadoutCode() { try { const { loadout, moduleCount } = decodeLoadoutCode(this.loadoutCodeInput.value); this.pushHistory(); this.loadout = loadout; this.instanceCounter = Math.max(this.instanceCounter, moduleCount + 1); this.renderAssembly(); this.hideLoadoutCode(); this.setStatus(`已导入 ${moduleCount} 个模块`); } catch (error) { this.loadoutCodeMessage.textContent = error instanceof Error ? error.message : "配置码无效"; } }
  getSelectedIds() { return { modules: this.loadout.modules.map(({ instanceId, moduleId, x, y, rotation }) => ({ instanceId, moduleId, x, y, rotation })), mode: this.selectedMode, level: this.selectedLevel }; }
  setStatus(message) { this.loadoutStatus.textContent = message; }
  setQuickAssembly(enabled) { this.quickAssemblyEnabled = Boolean(enabled); if (!this.quickAssemblyEnabled) { this.quickAssemblyModuleId = null; this.hideQuickAssemblyPreview(); } this.quickAssemblyToggle.classList.toggle("is-active", this.quickAssemblyEnabled); this.quickAssemblyToggle.setAttribute("aria-pressed", String(this.quickAssemblyEnabled)); this.quickAssemblyToggle.querySelector("small").textContent = this.quickAssemblyEnabled ? "ON" : "OFF"; this.moduleLibrary.querySelectorAll("[data-drag-module]").forEach((node) => node.classList.toggle("is-quick-selected", node.dataset.dragModule === this.quickAssemblyModuleId)); this.setStatus(this.quickAssemblyEnabled ? "快捷装配已开启：选择模块后点击核心网络" : "快捷装配已关闭"); }
  selectQuickAssemblyModule(moduleId) { const module = getModuleById(moduleId); if (!module) return; this.quickAssemblyModuleId = module.id; this.hideQuickAssemblyPreview(); this.hideModuleDetail(); this.moduleLibrary.querySelectorAll("[data-drag-module]").forEach((node) => node.classList.toggle("is-quick-selected", node.dataset.dragModule === module.id)); this.setStatus(`已选择${module.name}：点击核心网络装配`); }
  handleQuickAssemblyClick(event) { if (!this.quickAssemblyEnabled || !this.quickAssemblyModuleId || this.dragState) return; const rect = this.assemblyBoard.getBoundingClientRect(); if (!rect.width || !rect.height) return; const x = Math.max(0, Math.min(ASSEMBLY_BOARD.columns - 1, Math.floor((event.clientX - rect.left) / (rect.width / ASSEMBLY_BOARD.columns)))); const y = Math.max(0, Math.min(ASSEMBLY_BOARD.rows - 1, Math.floor((event.clientY - rect.top) / (rect.height / ASSEMBLY_BOARD.rows)))); const module = getModuleById(this.quickAssemblyModuleId); const installed = this.placeModule(module, x, y); this.setStatus(installed ? `已装配${module.name}，可继续点击网络` : "此位置无法装配，请选择相邻空位"); }
  hideQuickAssemblyPreview() { if (this.quickPreview) this.quickPreview.classList.remove("is-visible"); this.assemblyBoard?.querySelectorAll(".placed-module.at-risk").forEach((node) => node.classList.remove("at-risk")); }
  updateQuickAssemblyPreview(event) { if (!this.quickAssemblyEnabled || !this.quickAssemblyModuleId || this.dragState) { this.hideQuickAssemblyPreview(); return; } const rect = this.assemblyBoard.getBoundingClientRect(); if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) { this.hideQuickAssemblyPreview(); return; } const module = getModuleById(this.quickAssemblyModuleId); if (!module) return; if (!this.quickPreview || !this.quickPreview.isConnected) { this.quickPreview = document.createElement("div"); this.quickPreview.className = `drag-preview placed-${module.type}`; this.quickPreview.innerHTML = `<canvas class="placed-icon-canvas" width="48" height="48"></canvas>`; this.assemblyBoard.appendChild(this.quickPreview); } if (this.quickPreview.dataset.moduleId !== module.id) { this.quickPreview.dataset.moduleId = module.id; this.quickPreview.className = `drag-preview placed-${module.type}`; paintModuleCanvas(this.quickPreview.querySelector("canvas"), module, 48); } const x = Math.max(0, Math.min(ASSEMBLY_BOARD.columns - 1, Math.floor((event.clientX - rect.left) / (rect.width / ASSEMBLY_BOARD.columns)))); const y = Math.max(0, Math.min(ASSEMBLY_BOARD.rows - 1, Math.floor((event.clientY - rect.top) / (rect.height / ASSEMBLY_BOARD.rows)))); const candidate = this.buildCandidate(module, x, y); const staticValid = validateGeometry(candidate, { requireConnected: false }).valid; const repair = staticValid ? pruneDisconnected(candidate) : { removed: [] }; const bounds = getFootprintBounds(module); const removedIds = new Set(repair.removed.map((entry) => entry.instanceId)); this.assemblyBoard.querySelectorAll(".placed-module").forEach((node) => node.classList.toggle("at-risk", removedIds.has(node.dataset.instanceId))); this.quickPreview.style.left = `${((x + bounds.minX) / ASSEMBLY_BOARD.columns) * 100}%`; this.quickPreview.style.top = `${((y + bounds.minY) / ASSEMBLY_BOARD.rows) * 100}%`; this.quickPreview.style.width = `${(bounds.width / ASSEMBLY_BOARD.columns) * 100}%`; this.quickPreview.style.height = `${(bounds.height / ASSEMBLY_BOARD.rows) * 100}%`; this.quickPreview.classList.add("is-visible"); this.quickPreview.classList.toggle("preview-valid", staticValid && repair.removed.length === 0); this.quickPreview.classList.toggle("preview-impact", staticValid && repair.removed.length > 0); this.quickPreview.classList.toggle("preview-invalid", !staticValid); }
  pushHistory() { this.history.push(this.getSelectedIds()); if (this.history.length > 30) this.history.shift(); }
  undo() { const previous = this.history.pop(); if (!previous) { this.setStatus("\u6ca1\u6709\u53ef\u64a4\u9500\u7684\u6539\u52a8"); return; } this.loadout = createLoadout(previous); this.renderAssembly(); this.setStatus("\u5df2\u64a4\u9500\u4e0a\u4e00\u6b65\u6539\u52a8"); }
  hideAllScreens() { [this.menuScreen, this.modeScreen, this.levelSelectScreen, this.builderScreen, this.battleScreen].forEach((screen) => screen?.classList.add("is-hidden")); }
  showMenu() { this.hideAllScreens(); this.menuScreen.classList.remove("is-hidden"); this.gameOverScreen.classList.add("is-hidden"); this.hidePause(); this.hideModuleDetail(); this.hideLoadoutCode(); this.hideAttackSpeedRules(); this.settingsModal.classList.add("is-hidden"); }
  showModeSelect() { this.hideAllScreens(); this.modeScreen.classList.remove("is-hidden"); }
  showLevelSelect() { this.hideAllScreens(); this.levelSelectScreen.classList.remove("is-hidden"); }
  showBuilder() { this.hideAllScreens(); this.builderScreen.classList.remove("is-hidden"); this.gameOverScreen.classList.add("is-hidden"); this.hideLoadoutCode(); this.hideAttackSpeedRules(); requestAnimationFrame(() => this.updateLibraryScrollbar()); }
  showPlaying({ hp, maxHp, score, elapsed, skills = [], level = null, goal = null, boss = false }) { this.hideAllScreens(); this.battleScreen.classList.remove("is-hidden"); this.gameOverScreen.classList.add("is-hidden"); this.hidePause(); this.updateHud({ hp, maxHp, score, elapsed, level, goal, boss }); this.updateSkills(skills); }
  showPause() { this.pauseOverlay.classList.remove("is-hidden"); this.pauseConfirm.classList.add("is-hidden"); }
  hidePause() { this.pauseOverlay.classList.add("is-hidden"); this.pauseConfirm.classList.add("is-hidden"); }
  renderLevelGrid() { this.levelGrid.innerHTML = LEVELS.map((level) => `<button class="level-card ${level.boss ? "is-boss" : ""}" type="button" data-level="${level.number}"><b>${level.number}</b><span>${level.boss ? "BOSS" : "MISSION"}</span><small>${level.targetScore} PTS</small></button>`).join(""); }
  hideModuleDetail() { this.detailModal.classList.add("is-hidden"); }

  showModuleDetail(module) {
    if (!module) return;
    paintModuleCanvas(this.detailIconCanvas, module, 56);
    this.detailType.textContent = `${typeLabels[module.type] ?? module.type} / ${rarityLabels[module.rarity] ?? module.rarity}`;
    this.detailName.textContent = module.name;
    this.detailDescription.textContent = module.description;
    const bounds = getFootprintBounds(module); const behavior = module.behavior ?? {}; const projectile = behavior.projectile ?? {};
    const rows = [["\u5360\u4f4d", `${bounds.width} x ${bounds.height}`], ["ID", module.id], ["\u8fde\u63a5\u7c7b\u578b", module.connection ?? "-"], ["\u6a21\u5757\u7c7b\u578b", module.slotTypes?.join(" / ") ?? module.type]];
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
    const thumbHeight = Math.max(24, Math.min(track - 4, content > 0 ? track * viewport / content : track - 4));
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
  placeModule(module, x, y, instanceId = null) { if (!module) return false; const candidate = this.buildCandidate(module, x, y, instanceId); if (!validateGeometry(candidate, { requireConnected: false }).valid) return false; if (countSkillModules(candidate) > MAX_SKILL_MODULES) { this.setStatus(`主动技能模块最多装配 ${MAX_SKILL_MODULES} 个`); return false; } if (!instanceId && module.maxCount && this.loadout.modules.filter(({ module: current }) => current?.id === module.id).length >= module.maxCount) return false; this.pushHistory(); const repaired = pruneDisconnected(candidate); this.loadout = repaired.loadout; this.renderAssembly(); return repaired.loadout.modules.some((entry) => entry.instanceId === candidate.modules[candidate.modules.length - 1]?.instanceId); }
  updatePreview() { const stats = calculateFinalStats(PLAYER_BASE_STATS, getInstalledModules(this.loadout)); this.previewAttackSpeed.textContent = `${Math.round(stats.attackSpeed * 100)}%`; }
  updateHud({ hp, maxHp, score, elapsed, level = null, goal = null, boss = false }) { this.healthValue.textContent = `${hp} / ${maxHp}`; this.scoreValue.textContent = scoreText(score); this.timeValue.textContent = timeText(elapsed); if (this.levelValue) this.levelValue.textContent = level ? `${level}${boss ? " BOSS" : ` / ${goal ?? "-"}`}` : "ENDLESS"; }
  updateSkills(skills = []) { this.skillPanel.innerHTML = skills.map((skill, index) => { const cooldown = Math.max(0, skill.cooldownRemaining ?? 0); const cooling = cooldown > 0; return `<button class="skill-button ${cooling ? "is-cooling" : ""}" type="button" data-skill-index="${index}" ${cooling ? "disabled" : ""}><b>${index + 1}</b><span>${escapeHtml(skill.name)}</span><small>${cooling ? `${cooldown.toFixed(1)}s` : "\u5c31\u7eea"}</small></button>`; }).join(""); }
  showGameOver({ score, elapsed, victory = false, level = null, mode = "endless" }) { this.battleScreen.classList.remove("is-hidden"); this.gameOverScreen.classList.remove("is-hidden"); this.finalScoreValue.textContent = scoreText(score); this.timeValue.textContent = timeText(elapsed); this.gameOverEyebrow.textContent = victory ? "MISSION CLEAR" : "SIGNAL LOST"; this.gameOverTitle.textContent = victory ? "关卡完成" : "任务结束"; this.gameOverMessage.textContent = victory ? `第 ${level} 关已完成，准备迎接下一场战斗。` : "你的战机已失去战斗能力。"; this.nextLevelButton.classList.toggle("is-hidden", !victory || !level || level >= 25); this.gameOverReturnTarget = mode === "endless" ? "mode" : "level"; this.returnLevelSelectButton.textContent = this.gameOverReturnTarget === "mode" ? "返回模式选择" : "返回选关"; }
}
