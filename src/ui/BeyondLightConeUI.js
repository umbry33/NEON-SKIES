import { createLoadout, getModuleById } from "../config/module-config.js";
import { decodeLoadoutCode } from "../systems/LoadoutCodec.js";
import { validateLoadout } from "../systems/ModuleSystem.js";
import { BEYOND_LIGHT_CONE_CONFIG } from "../config/beyond-light-cone-config.js";
import { paintModuleCanvas } from "../rendering/ModuleRenderer.js";

// 以“松开”作为唯一触发时机。移动端直接处理 pointerup，随后拦截浏览器补发的
// click，避免弹窗刚出现后，延迟 click 被重新命中到节点图或下一层界面。
const tap = (element, handler) => {
  if (!element) return;
  let handledByPointer = 0;
  let lastPointerUp = 0;
  const invoke = (event) => {
    if (element.disabled) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    handledByPointer = performance.now() + 600;
    lastPointerUp = performance.now();
    handler(event);
  };
  element.addEventListener("pointerup", (event) => {
    // 部分移动端浏览器在触摸 pointerup 上会报告 -1，而不是 0；
    // 只有明确的非主键鼠标/触控笔才应被忽略。
    if (event.pointerType !== "touch" && event.pointerType !== "pen" && event.button != null && event.button !== 0) return;
    invoke(event);
  });
  // 兼容仍优先派发 touchend 的旧式移动端 WebView。现代浏览器会先派发
  // pointerup，因此用时间窗避免同一次触摸被执行两次。
  element.addEventListener("touchend", (event) => {
    if (performance.now() - lastPointerUp < 80) return;
    invoke(event);
  });
  element.addEventListener("click", (event) => {
    if (performance.now() < handledByPointer) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!element.disabled) handler(event);
  });
};
const escapeHtml = (value) => String(value).replace(/[&<>\x27"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\x27": "&#39;", '"': "&quot;" }[char]));
const emit = (ui, name, detail = {}) => ui.beyondScreen?.dispatchEvent(new CustomEvent(name, { detail }));
const setAnimatedVisibility = (element, visible, after = null) => {
  if (!element) { after?.(); return; }
  clearTimeout(element.__beyondAnimationTimer);
  if (visible) {
    // 防止同一次触摸同时触发 pointerup/click 时重复重启动画，造成弹窗闪退再出现。
    if (!element.classList.contains("is-hidden") && !element.classList.contains("is-closing")) return;
    // 先挂上进入动画，再解除隐藏，避免解除 is-hidden 的瞬间先触发一轮通用弹窗动画，
    // 随后又被专用动画覆盖，造成弹窗闪退、跳屏或短暂消失。
    element.classList.remove("is-closing");
    element.classList.add("is-opening");
    element.classList.remove("is-hidden");
    element.__beyondAnimationTimer = setTimeout(() => element.classList.remove("is-opening"), 260);
    return;
  }
  if (element.classList.contains("is-hidden") && !element.classList.contains("is-closing")) { after?.(); return; }
  element.classList.remove("is-opening");
  element.classList.add("is-closing");
  element.__beyondAnimationTimer = setTimeout(() => {
    element.classList.add("is-hidden");
    element.classList.remove("is-closing");
    after?.();
  }, 190);
};

export function installBeyondLightConeUI(ui) {
  const screen = document.createElement("section");
  screen.id = "beyond-screen"; screen.className = "game-screen beyond-screen is-hidden";
  screen.innerHTML = `<div class="beyond-shell"><header class="beyond-header"><button id="beyond-back-button" class="round-button" type="button">&lt;</button><div><p class="eyebrow">BEYOND LIGHT CONE</p><h2>光锥之外</h2></div><button id="beyond-save-button" class="quick-assembly-toggle" type="button">存档码</button></header><section id="beyond-start-panel" class="beyond-start-panel"><p>随机生成航线、即时构筑机体，抵达地图顶端并击败首领。</p><div id="beyond-difficulty-grid" class="beyond-difficulty-grid"></div><button id="beyond-new-run-button" class="primary-button" type="button">开始新的航程</button><button id="beyond-load-button" class="secondary-button" type="button">导入航程存档</button></section><section id="beyond-run-panel" class="beyond-run-panel is-hidden"><div class="beyond-run-hud"><span>生命 <b id="beyond-hp">100 / 100</b></span><span>金币 <b id="beyond-gold">48</b></span><span>难度 <b id="beyond-difficulty">Lv.1</b></span><span>章节 <b id="beyond-chapter">1 / 1</b></span><button id="beyond-build-button" class="quick-assembly-toggle" type="button">改装机体</button><button id="beyond-fusion-button" class="quick-assembly-toggle" type="button">模块合成</button></div><p id="beyond-route-hint" class="beyond-route-hint">选择下一处航线节点</p><div id="beyond-map" class="beyond-map"></div><div id="beyond-node-panel" class="beyond-node-panel beyond-animated beyond-panel-motion is-hidden"><p id="beyond-node-tag" class="eyebrow">NODE</p><h3 id="beyond-node-title">节点</h3><p id="beyond-node-description"></p><div id="beyond-node-rewards" class="beyond-node-rewards"></div><button id="beyond-node-action" class="primary-button" type="button">进入</button><button id="beyond-node-close" class="secondary-button" type="button">返回路线图</button></div></section><section id="beyond-fusion-panel" class="beyond-fusion-panel is-hidden"><header><button id="beyond-fusion-back" class="round-button" type="button">&lt;</button><div><p class="eyebrow">MODULE FUSION</p><h2>模块合成</h2></div><button id="beyond-fusion-recipes" class="quick-assembly-toggle" type="button">查看配方</button></header><div class="beyond-fusion-mode"><button data-fusion-mode="synthesize" class="is-active" type="button">合成模式</button><button data-fusion-mode="decompose" type="button">分解模式</button></div><p id="beyond-fusion-message" class="beyond-route-hint">从库存拖动未装配模块，放入合成台对应位置。</p><div class="beyond-fusion-layout"><section><h3>本局库存</h3><div id="beyond-fusion-inventory" class="beyond-fusion-inventory"></div></section><section><h3 id="beyond-fusion-station-title">3 × 3 合成台</h3><div id="beyond-fusion-grid" class="beyond-fusion-grid"></div><button id="beyond-fusion-action" class="primary-button" type="button">开始合成</button></section></div><section id="beyond-fusion-recipe-list" class="beyond-fusion-recipe-list is-hidden"></section></section></div><div id="beyond-save-modal" class="module-detail-modal beyond-animated is-hidden"><div class="module-detail-card loadout-code-card"><button id="beyond-save-close" class="detail-close" type="button">X</button><p class="eyebrow">RUN ARCHIVE</p><h3>航程存档码</h3><p class="detail-description">保存地图、路线、库存、机体与当前进度。</p><textarea id="beyond-save-input" class="loadout-code-input" spellcheck="false"></textarea><p id="beyond-save-message" class="loadout-code-message"></p><button id="beyond-save-copy" class="secondary-button" type="button">复制存档码</button><button id="beyond-save-import" class="primary-button" type="button">导入航程</button></div></div><div id="beyond-exit-backdrop" class="beyond-exit-backdrop is-hidden" aria-hidden="true"></div><div id="beyond-exit-one" class="screen-overlay beyond-animated is-hidden"><div class="overlay-card"><p class="eyebrow">END EXPEDITION</p><h2>退出本次航程？</h2><p>建议先复制存档码。</p><button id="beyond-exit-one-cancel" class="secondary-button" type="button">取消</button><button id="beyond-exit-one-next" class="primary-button" type="button">继续退出</button></div></div><div id="beyond-exit-two" class="screen-overlay beyond-animated is-hidden"><div class="overlay-card"><p class="eyebrow">FINAL CONFIRMATION</p><h2>确认放弃航程？</h2><p>本次获得的模块都会消失。</p><button id="beyond-exit-two-cancel" class="secondary-button" type="button">返回</button><button id="beyond-exit-confirm" class="primary-button" type="button">确认退出</button></div></div>`;
  document.querySelector(".app-shell")?.append(screen);
  const beyondStartPanel = screen.querySelector("#beyond-start-panel");
  const localSaveNote = document.createElement("div"); localSaveNote.id = "beyond-local-save-note"; localSaveNote.className = "beyond-local-save-note is-hidden"; localSaveNote.textContent = "检测到本地航程存档";
  const resumeLocalButton = document.createElement("button"); resumeLocalButton.id = "beyond-resume-button"; resumeLocalButton.className = "secondary-button is-hidden"; resumeLocalButton.type = "button"; resumeLocalButton.textContent = "继续本地航程";
  beyondStartPanel?.querySelector("#beyond-difficulty-grid")?.before(localSaveNote); beyondStartPanel?.querySelector("#beyond-load-button")?.before(resumeLocalButton);
  screen.querySelector("#beyond-fusion-button")?.remove();
  const resultModal = document.createElement("div");
  resultModal.id = "beyond-result-modal";
  resultModal.className = "beyond-result-modal beyond-animated is-hidden";
  resultModal.innerHTML = `<div class="beyond-result-card"><p id="beyond-result-tag" class="eyebrow">NODE REPORT</p><h3 id="beyond-result-title">节点结果</h3><p id="beyond-result-message" class="detail-description"></p><div id="beyond-result-details" class="beyond-result-details"></div><div id="beyond-result-rewards" class="beyond-result-rewards"></div><button id="beyond-result-continue" class="primary-button" type="button">继续航程</button></div>`;
  screen.append(resultModal);
  const fusionResultModal = document.createElement("div");
  fusionResultModal.id = "beyond-fusion-result-modal";
  fusionResultModal.className = "beyond-fusion-result-modal beyond-animated is-hidden";
  fusionResultModal.innerHTML = `<div class="beyond-fusion-result-card"><p class="eyebrow">MODULE FORGED</p><h3>合成成功</h3><canvas id="beyond-fusion-result-icon" width="96" height="96" aria-hidden="true"></canvas><strong id="beyond-fusion-result-name"></strong><p id="beyond-fusion-result-message">新的模块已加入本局库存。</p><button id="beyond-fusion-result-close" class="primary-button" type="button">继续合成</button></div>`;
  screen.append(fusionResultModal);
  const eventPanel = document.createElement("div");
  eventPanel.id = "beyond-event-panel";
  eventPanel.className = "beyond-event-panel beyond-animated is-hidden";
  eventPanel.innerHTML = `<div class="beyond-event-card"><p id="beyond-event-tag" class="eyebrow">UNKNOWN SIGNAL</p><h3 id="beyond-event-title">事件</h3><p id="beyond-event-description" class="detail-description"></p><div id="beyond-event-choices" class="beyond-event-choices"></div><p id="beyond-event-message" class="beyond-event-message"></p></div>`;
  screen.append(eventPanel);
  const completeModal = document.createElement("div");
  completeModal.id = "beyond-complete-modal";
  completeModal.className = "beyond-complete-modal beyond-animated is-hidden";
  completeModal.innerHTML = `<div class="beyond-complete-card"><p class="eyebrow">EXPEDITION COMPLETE</p><h3>光锥之外</h3><p class="beyond-complete-message">你已击败最终首领，完成本次航程。</p><div id="beyond-complete-stats" class="beyond-complete-stats"></div><div id="beyond-complete-rewards" class="beyond-complete-rewards"></div><button id="beyond-complete-exit" class="primary-button" type="button">退出航程</button></div>`;
  screen.append(completeModal);
  const shopPanel = document.createElement("div"); shopPanel.className = "beyond-shop-panel beyond-animated beyond-panel-motion is-hidden"; shopPanel.innerHTML = `<p class="eyebrow">TRADING SIGNAL</p><h3>模块商店</h3><p>消耗本局金币购买模块，立刻加入库存。</p><div class="beyond-shop-offers"></div><button type="button" class="secondary-button" data-shop-close>离开商店</button>`; screen.querySelector(".beyond-shell")?.append(shopPanel);
  ui.beyondScreen = screen; ui.beyondSelectedDifficulty = 1; ui.beyondRun = null; ui.beyondBuilderMode = false; ui.gameOverScreen?.classList.add("beyond-animated");
  const $ = (selector) => screen.querySelector(selector);
  const startPanel = $("#beyond-start-panel"); const runPanel = $("#beyond-run-panel"); const grid = $("#beyond-difficulty-grid"); const map = $("#beyond-map"); const nodePanel = $("#beyond-node-panel"); const saveModal = $("#beyond-save-modal"); const saveCopy = $("#beyond-save-copy"); const saveImport = $("#beyond-save-import"); const resultTag = $("#beyond-result-tag"); const resultTitle = $("#beyond-result-title"); const resultMessage = $("#beyond-result-message"); const resultDetails = $("#beyond-result-details"); const resultRewards = $("#beyond-result-rewards"); const resultContinue = $("#beyond-result-continue"); const eventTag = $("#beyond-event-tag"); const eventTitle = $("#beyond-event-title"); const eventDescription = $("#beyond-event-description"); const eventChoices = $("#beyond-event-choices"); const eventMessage = $("#beyond-event-message"); const completeStats = $("#beyond-complete-stats"); const completeRewards = $("#beyond-complete-rewards"); const completeExit = $("#beyond-complete-exit"); const completeEyebrow = completeModal.querySelector(".eyebrow"); const completeTitle = completeModal.querySelector("h3"); const completeMessage = completeModal.querySelector(".beyond-complete-message");
  const resumeLocal = $("#beyond-resume-button"); const localSaveStatus = $("#beyond-local-save-note");
  const setLocalSaveAvailable = (available) => { resumeLocal?.classList.toggle("is-hidden", !available); localSaveStatus?.classList.toggle("is-hidden", !available); };
  ui.setBeyondLocalSaveAvailable = setLocalSaveAvailable;
  const setArchiveAction = (action) => { saveCopy?.classList.toggle("is-hidden", action !== "copy"); saveImport?.classList.toggle("is-hidden", action !== "import"); };
  const exitBackdrop = $("#beyond-exit-backdrop");
  const rarityNames = { common: "普通", uncommon: "非凡", rare: "稀有", epic: "史诗", legendary: "传说" };
  const createModuleRewardIcon = (module, className, size = 36) => {
    const canvas = document.createElement("canvas");
    canvas.className = className;
    canvas.width = size;
    canvas.height = size;
    canvas.setAttribute("aria-hidden", "true");
    paintModuleCanvas(canvas, module, size);
    return canvas;
  };
  const hideComplete = () => { completeModal.classList.add("is-hidden"); completeModal.classList.remove("is-closing", "is-opening"); };
  const formatBeyondTime = (seconds = 0) => { const total = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; };
  const renderCompletionRewards = (rewardIds = []) => {
    completeRewards.innerHTML = "";
    rewardIds.map((id) => getModuleById(id)).filter(Boolean).forEach((module) => {
      const item = document.createElement("div");
      item.className = `beyond-complete-reward rarity-${module.rarity ?? "common"}`;
      const copy = document.createElement("span");
      copy.innerHTML = `<strong>${module.name}</strong><small>${rarityNames[module.rarity] ?? "模块"}</small>`;
      item.append(createModuleRewardIcon(module, "beyond-complete-reward-icon"), copy);
      completeRewards.append(item);
    });
  };
  ui.hideBeyondComplete = hideComplete;
  ui.showBeyondComplete = ({ summary = {}, victory = true } = {}) => {
    ui.gameOverScreen?.classList.add("is-hidden");
    ui.hideAllScreens();
    screen.classList.remove("is-hidden");
    startPanel.classList.add("is-hidden");
    runPanel.classList.add("is-hidden");
    hideExitOverlays();
    hideResult();
    completeModal.classList.toggle("is-failed", !victory);
    if (completeEyebrow) completeEyebrow.textContent = victory ? "EXPEDITION COMPLETE" : "EXPEDITION FAILED";
    if (completeTitle) completeTitle.textContent = victory ? "光锥之外" : "航程结束";
    if (completeMessage) completeMessage.textContent = victory ? "你已击败最终首领，完成本次航程。" : "战斗失败，本次航程已结束。";
    if (completeExit) completeExit.textContent = victory ? "退出航程" : "返回主菜单";
    completeStats.innerHTML = [
      ["航程难度", `Lv.${summary.difficulty ?? 1}`],
      ["航程用时", formatBeyondTime(summary.elapsed)],
      ["路线节点", `${summary.routeLength ?? 0}`],
      ["战斗次数", `${summary.battles ?? 0}`],
      ["事件 / 商店 / 回复", `${summary.events ?? 0} / ${summary.shops ?? 0} / ${summary.rests ?? 0}`],
      ["累计恢复", `${summary.healing ?? 0} HP`],
      ["最终得分", String(summary.score ?? 0).padStart(6, "0")],
    ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
    renderCompletionRewards(victory ? (summary.rewardIds ?? []) : []);
    if (victory) completeRewards.insertAdjacentHTML("afterbegin", `<p class="beyond-complete-reward-total">获得模块 ${summary.modulesGained ?? 0} 个　金币 +${summary.goldGained ?? 0}　最终金币 ${summary.finalGold ?? 0}</p>`);
    setAnimatedVisibility(completeModal, true);
  };
  const hideResult = () => { resultModal.classList.add("is-hidden"); resultModal.classList.remove("is-closing", "is-opening"); ui.beyondPendingResultAction = null; };
  const hideEvent = () => { eventPanel.classList.add("is-hidden"); eventPanel.classList.remove("is-closing", "is-opening"); };
  ui.hideBeyondEvent = hideEvent;
  ui.showBeyondEventError = (message) => { if (eventMessage) eventMessage.textContent = message; };
  ui.showBeyondEvent = (encounter) => {
    const event = encounter?.event;
    if (!event) return;
    setAnimatedVisibility(nodePanel, false);
    eventTag.textContent = event.tag ?? "UNKNOWN SIGNAL";
    eventTitle.textContent = event.title;
    eventDescription.textContent = event.description;
    eventMessage.textContent = "选择一种处理方式，结果会立即记录到本次航程。";
    eventChoices.innerHTML = (encounter.choices ?? []).map((item) => `<button type="button" class="${item.available ? "primary-button" : "secondary-button"}" data-event-choice="${item.id}" ${item.available ? "" : "disabled"}><strong>${item.label}</strong><small>${item.available ? item.hint : item.reason}</small></button>`).join("");
    eventChoices.querySelectorAll("[data-event-choice]").forEach((button) => tap(button, () => emit(ui, "beyond:event-choice", { nodeId: encounter.nodeId, eventId: event.id, choiceId: button.dataset.eventChoice })));
    setAnimatedVisibility(eventPanel, true);
  };
  const renderResultRewards = (rewardIds = []) => {
    resultRewards.innerHTML = "";
    if (!rewardIds.length) return;
    rewardIds.map((id) => getModuleById(id)).filter(Boolean).forEach((module) => {
      const item = document.createElement("div");
      item.className = `beyond-result-reward rarity-${module.rarity ?? "common"}`;
      const copy = document.createElement("span");
      copy.className = "beyond-result-reward-copy";
      const name = document.createElement("strong");
      name.textContent = module.name;
      const rarity = document.createElement("small");
      rarity.textContent = rarityNames[module.rarity] ?? "模块";
      copy.append(name, rarity);
      item.append(createModuleRewardIcon(module, "beyond-result-reward-icon"), copy);
      resultRewards.append(item);
    });
  };
  ui.showBeyondResult = ({ node, result, action = "map" }) => {
    const info = BEYOND_LIGHT_CONE_CONFIG.nodeTypes[node?.type] ?? {};
    ui.beyondPendingResultAction = action;
    resultTag.textContent = action === "combat" ? "EVENT SIGNAL" : `${info.name ?? "NODE"} REPORT`;
    resultTitle.textContent = action === "combat" ? "事件触发战斗" : `${info.icon ?? "◆"} ${info.name ?? "节点完成"}`;
    resultMessage.textContent = result?.message ?? "节点结算完成";
    const details = [];
    if (result?.goldAmount) details.push(`获得 ${result.goldAmount} 金币`);
    if (result?.healAmount) details.push(`恢复 ${result.healAmount} 点生命`);
    if (result?.rewardIds?.length) details.push("获得的模块已加入本次航程库存");
    if (action === "combat") details.push("确认后进入这次事件战斗");
    resultDetails.textContent = details.join(" · ") || "结果已记录到本次航程";
    renderResultRewards(result?.rewardIds ?? []);
    resultContinue.textContent = action === "combat" ? "进入战斗" : "继续航程";
    setAnimatedVisibility(resultModal, true);
  };
  ui.hideBeyondResult = hideResult;
  ui.showBeyondBattleRewards = (rewardIds = [], goldAmount = 0) => {
    const card = ui.gameOverScreen?.querySelector(".game-over-card");
    if (!card) return;
    let panel = card.querySelector("#beyond-battle-rewards");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "beyond-battle-rewards";
      panel.className = "beyond-battle-rewards";
      card.querySelector("#next-level-button")?.before(panel);
    }
    panel.innerHTML = "";
    const heading = document.createElement("p");
    heading.className = "beyond-reward-heading";
    heading.textContent = "本次战斗获得";
    panel.append(heading);
    const gold = document.createElement("p");
    gold.className = "beyond-reward-gold";
    gold.textContent = `金币 +${goldAmount}`;
    panel.append(gold);
    const grid = document.createElement("div");
    grid.className = "beyond-reward-grid";
    const rarityNames = { common: "普通", uncommon: "非凡", rare: "稀有", epic: "史诗", legendary: "传说" };
    rewardIds.map((id) => getModuleById(id)).filter(Boolean).forEach((module) => {
      const item = document.createElement("div");
      item.className = `beyond-reward-item rarity-${module.rarity ?? "common"}`;
      const copy = document.createElement("span");
      copy.className = "beyond-reward-copy";
      const name = document.createElement("strong");
      name.textContent = module.name;
      const rarity = document.createElement("small");
      rarity.textContent = rarityNames[module.rarity] ?? "模块";
      copy.append(name, rarity);
      item.append(createModuleRewardIcon(module, "beyond-reward-icon", 34), copy);
      grid.append(item);
    });
    panel.append(grid);
  };
  ui.hideBeyondBattleRewards = () => { ui.gameOverScreen?.querySelector("#beyond-battle-rewards")?.remove(); };
  const validateBeyondLoadoutInventory = (loadout) => {
    if (!ui.beyondBuilderMode || !ui.beyondRun) return { valid: true };
    const required = new Map();
    for (const entry of loadout?.modules ?? []) {
      const moduleId = entry.moduleId ?? entry.module?.id;
      if (moduleId) required.set(moduleId, (required.get(moduleId) ?? 0) + 1);
    }
    const missing = [...required.entries()].filter(([moduleId, amount]) => amount > (ui.beyondRun.inventory?.[moduleId] ?? 0));
    if (!missing.length) return { valid: true };
    const detail = missing.map(([moduleId, amount]) => {
      const owned = ui.beyondRun.inventory?.[moduleId] ?? 0;
      const name = getModuleById(moduleId)?.name ?? moduleId;
      return `${name}（需要 ${amount} 个，拥有 ${owned} 个）`;
    }).join("、");
    return { valid: false, reason: `库存不足，无法导入：${detail}` };
  };
  const nativeImportLoadout = ui.importLoadoutCode.bind(ui);
  ui.importLoadoutCode = () => {
    if (!ui.beyondBuilderMode) return nativeImportLoadout();
    try {
      const { loadout } = decodeLoadoutCode(ui.loadoutCodeInput.value);
      const result = validateBeyondLoadoutInventory(loadout);
      if (!result.valid) {
        ui.loadoutCodeMessage.textContent = result.reason;
        return;
      }
    } catch {
      // 让原有导入逻辑统一处理配置码格式和几何校验错误。
    }
    nativeImportLoadout();
  };
  const modeButton = document.createElement("button"); modeButton.id = "beyond-mode-button"; modeButton.className = "mode-card beyond-mode-card"; modeButton.type = "button"; modeButton.innerHTML = "<strong>光锥之外</strong><small>BEYOND LIGHT CONE / CHAPTER RUN</small>";
  ui.modeScreen?.querySelector(".mode-actions")?.insertBefore(modeButton, ui.dodgeModeButton); ui.beyondModeButton = modeButton;

  const nativeHideAll = ui.hideAllScreens.bind(ui); ui.hideAllScreens = () => { nativeHideAll(); screen.classList.add("is-hidden"); };
  const nativeRenderLibrary = ui.renderModuleLibrary.bind(ui); ui.renderModuleLibrary = () => { nativeRenderLibrary(); if (!ui.beyondBuilderMode) return; ui.moduleLibrary.querySelectorAll("[data-drag-module]").forEach((card) => { const id = card.dataset.dragModule; const owned = ui.beyondRun?.inventory?.[id] ?? 0; const used = ui.loadout.modules.filter((entry) => entry.moduleId === id).length; const remaining = owned - used; card.disabled = remaining <= 0; card.classList.toggle("is-out-of-stock", remaining <= 0); card.querySelector("strong")?.append(` ×${Math.max(0, remaining)}`); }); };
  const nativePlaceModule = ui.placeModule.bind(ui); ui.placeModule = (module, x, y, instanceId = null) => { if (ui.beyondBuilderMode && !instanceId) { const used = ui.loadout.modules.filter((entry) => entry.moduleId === module?.id).length; if (used >= (ui.beyondRun?.inventory?.[module?.id] ?? 0)) { ui.setStatus("本次航程没有更多该模块库存"); return false; } } const installed = nativePlaceModule(module, x, y, instanceId); if (installed && ui.beyondBuilderMode) ui.renderModuleLibrary(); return installed; };
  const nativeSaveBuild = ui.saveBuild.bind(ui); ui.saveBuild = () => { if (!ui.beyondBuilderMode) return nativeSaveBuild(); const result = validateLoadout(ui.loadout); if (!result.valid) { ui.setStatus(result.reason); return; } emit(ui, "beyond:build-save", { loadout: ui.getSelectedIds() }); };

  grid.innerHTML = `<button class="beyond-difficulty-arrow" type="button" data-difficulty-step="-1" aria-label="降低难度">◀</button><div class="beyond-difficulty-current" aria-live="polite"><small>DIFFICULTY</small><b data-difficulty-level>1</b><strong data-difficulty-name>非常简单</strong></div><button class="beyond-difficulty-arrow" type="button" data-difficulty-step="1" aria-label="提高难度">▶</button>`;
  const renderDifficultyPicker = () => {
    const difficulty = BEYOND_LIGHT_CONE_CONFIG.difficulties.find((entry) => entry.level === ui.beyondSelectedDifficulty) ?? BEYOND_LIGHT_CONE_CONFIG.difficulties[0];
    ui.beyondSelectedDifficulty = difficulty.level;
    grid.querySelector("[data-difficulty-level]").textContent = String(difficulty.level);
    grid.querySelector("[data-difficulty-name]").textContent = difficulty.name;
    grid.querySelector(".beyond-difficulty-current")?.classList.toggle("is-limit", difficulty.level === 4);
  };
  grid.querySelectorAll("[data-difficulty-step]").forEach((button) => tap(button, () => {
    const total = BEYOND_LIGHT_CONE_CONFIG.difficulties.length;
    const step = Number(button.dataset.difficultyStep);
    ui.beyondSelectedDifficulty = ((ui.beyondSelectedDifficulty - 1 + step + total) % total) + 1;
    renderDifficultyPicker();
  }));
  renderDifficultyPicker();
  const leaveDifficultySelect = (event) => {
    if (startPanel.classList.contains("is-hidden")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    screen.classList.add("is-hidden");
    ui.showModeSelect({ direction: "back" });
    // 同一次触摸产生的后续事件可能继续触发旧的页面切换；下一帧再确认一次目标。
    requestAnimationFrame(() => ui.showModeSelect({ direction: "back" }));
  };
  const backButton = $("#beyond-back-button");
  const fusionPanel = $("#beyond-fusion-panel"); const fusionGrid = $("#beyond-fusion-grid"); const fusionInventory = $("#beyond-fusion-inventory"); const fusionMessage = $("#beyond-fusion-message"); const fusionAction = $("#beyond-fusion-action"); const fusionRecipeList = $("#beyond-fusion-recipe-list");
  ui.beyondFusionMode = "synthesize"; ui.beyondFusionSlots = Array(9).fill(null); ui.beyondFusionSelected = null; ui.beyondFusionTarget = null; ui.beyondFusionDrag = null;
  fusionPanel.querySelector(".beyond-fusion-mode")?.remove();
  $("#beyond-fusion-recipes")?.remove();
  const fusionLayout = fusionPanel.querySelector(".beyond-fusion-layout");
  const inventorySection = fusionInventory?.closest("section");
  const stationSection = fusionGrid?.closest("section");
  const recipeSection = document.createElement("section");
  recipeSection.className = "beyond-fusion-recipes-section";
  recipeSection.innerHTML = "<h3>全部合成配方</h3>";
  const recipeScrollFrame = document.createElement("div");
  recipeScrollFrame.className = "beyond-fusion-recipe-scroll-frame";
  recipeScrollFrame.append(fusionRecipeList);
  recipeSection.append(recipeScrollFrame);
  fusionLayout?.insertBefore(recipeSection, stationSection);
  if (inventorySection) fusionLayout?.append(inventorySection);
  const getFusionPreviewSlots = (module) => {
    if (!module?.fusionRecipe?.length) return Array(9).fill(null);
    const minX = Math.min(...module.fusionRecipe.map((item) => item.x)); const maxX = Math.max(...module.fusionRecipe.map((item) => item.x));
    const minY = Math.min(...module.fusionRecipe.map((item) => item.y)); const maxY = Math.max(...module.fusionRecipe.map((item) => item.y));
    const offsetX = Math.floor((3 - (maxX - minX + 1)) / 2) - minX; const offsetY = Math.floor((3 - (maxY - minY + 1)) / 2) - minY;
    const preview = Array(9).fill(null); module.fusionRecipe.forEach((item) => { preview[(item.y + offsetY) * 3 + item.x + offsetX] = item.moduleId; }); return preview;
  };
  const fusionSlotMarkup = (id, index, previewId = null) => {
    const ghost = !id && previewId; const module = getModuleById(id ?? previewId);
    const moduleId = id ?? previewId;
    const label = module?.name ?? (id ?? "＋");
    return `<button type="button" class="beyond-fusion-slot${ghost ? " is-recipe-ghost" : ""}" data-fusion-slot="${index}" aria-label="${ghost ? `配方参考：${label}` : id ? `已放置：${label}` : "空合成槽"}">${moduleId ? `<canvas class="fusion-slot-icon" width="48" height="48" data-icon-module="${moduleId}" aria-hidden="true"></canvas><span>${escapeHtml(label)}</span>` : "＋"}</button>`;
  };
  const recipeMaterialsAvailable = (module) => {
    const counts = new Map((ui.beyondFusionData?.inventoryRows ?? []).map((row) => [row.id, row.free ?? 0]));
    const required = new Map();
    (module?.fusionRecipe ?? []).forEach((item) => required.set(item.moduleId, (required.get(item.moduleId) ?? 0) + 1));
    return [...required].every(([id, count]) => (counts.get(id) ?? 0) >= count);
  };
  const renderFusion = (data) => {
    const { inventoryRows = [], recipes = [] } = data ?? ui.beyondFusionData ?? {}; ui.beyondFusionData = { inventoryRows, recipes };
    requestAnimationFrame(() => {
      const counts = new Map((ui.beyondFusionData?.inventoryRows ?? []).map((row) => [row.id, row.free ?? 0]));
      const ordered = Array.from(fusionRecipeList.querySelectorAll("[data-fusion-recipe]")).map((button) => {
        const module = getModuleById(button.dataset.fusionRecipe); const required = new Map();
        (module?.fusionRecipe ?? []).forEach((item) => required.set(item.moduleId, (required.get(item.moduleId) ?? 0) + 1));
        const available = [...required].every(([id, count]) => (counts.get(id) ?? 0) >= count);
        button.classList.toggle("is-available", available); const hint = button.querySelector("em");
        if (hint) hint.textContent = available ? "材料齐全 · 点击设为目标配方" : "材料不足 · 点击设为目标配方";
        return { button, available };
      }).sort((left, right) => Number(right.available) - Number(left.available));
      ordered.forEach(({ button }) => fusionRecipeList.appendChild(button));
    });
    const decompose = ui.beyondFusionMode === "decompose";
    fusionRecipeList.classList.toggle("is-hidden", decompose);
    recipeSection.classList.toggle("is-hidden", decompose);
    $("#beyond-fusion-station-title").textContent = decompose ? "分解台" : "3 × 3 合成台";
    fusionAction.textContent = decompose ? "分解选中模块" : "开始合成";
    fusionMessage.textContent = decompose ? "选择一件未装配的合成模块，完整返还配方材料。" : "从库存选择未装配模块，再放入合成台；配方允许整体平移。";
    const inventoryGroups = [["weapon", "自动模块"], ["special", "技能模块"]]; fusionInventory.classList.add("beyond-fusion-library"); fusionInventory.innerHTML = inventoryGroups.map(([type, title]) => { const rows = inventoryRows.filter((row) => getModuleById(row.id)?.type === type); if (!rows.length) return ""; return `<section class="library-group" data-module-type="${type}"><div class="library-group-title"><span>${title}</span><small>拖入九宫格</small></div><div class="library-cards">${rows.map((row) => { const module = getModuleById(row.id); const used = decompose ? 0 : ui.beyondFusionSlots.filter((id) => id === row.id).length; const availableNow = Math.max(0, row.free - used); const selectable = decompose ? Boolean(module?.fusionRecipe?.length && row.free > 0) : availableNow > 0; return `<button type="button" class="library-module beyond-fusion-library-module${ui.beyondFusionSelected === row.id ? " is-selected" : ""}" data-fusion-input="${row.id}" data-drag-module="${row.id}" draggable="${selectable}" ${selectable ? "" : "disabled"} title="拖动到合成台"><canvas class="module-icon-canvas" width="36" height="36" data-icon-module="${row.id}" aria-hidden="true"></canvas><span class="library-module-copy"><strong>${escapeHtml(module?.name ?? row.id)}</strong><small>库存 ${row.count} / 可用 ${availableNow}</small></span><span class="install-mark">+</span></button>`; }).join("")}</div></section>`; }).join("") || "<p>暂无可用模块</p>";
    fusionInventory.querySelectorAll("[data-icon-module]").forEach((canvas) => paintModuleCanvas(canvas, getModuleById(canvas.dataset.iconModule), canvas.width));
    fusionInventory.querySelectorAll("[data-fusion-input]").forEach((button) => {
      button.addEventListener("dragstart", (event) => { if (button.disabled) { event.preventDefault(); return; } ui.beyondFusionDrag = { moduleId: button.dataset.fusionInput, sourceIndex: null }; event.dataTransfer?.setData("text/plain", button.dataset.fusionInput); button.classList.add("is-dragging"); });
      button.addEventListener("dragend", () => { button.classList.remove("is-dragging"); ui.beyondFusionDrag = null; });
      tap(button, () => { if (ui.beyondFusionMode === "decompose") { ui.beyondFusionSelected = button.dataset.fusionInput; renderFusion(); } });
    });
    fusionGrid.classList.toggle("is-decompose", decompose);
    const previewSlots = getFusionPreviewSlots(getModuleById(ui.beyondFusionTarget));
    fusionGrid.innerHTML = decompose ? `<button type="button" class="beyond-fusion-decompose-slot" data-fusion-decompose>${ui.beyondFusionSelected ? (getModuleById(ui.beyondFusionSelected)?.name ?? ui.beyondFusionSelected) : "拖入待分解模块"}</button>` : ui.beyondFusionSlots.map((id, index) => fusionSlotMarkup(id, index, previewSlots[index])).join("");
    fusionGrid.querySelectorAll("[data-fusion-slot]").forEach((button) => {
      button.addEventListener("dragover", (event) => { event.preventDefault(); button.classList.add("is-drop-target"); });
      button.addEventListener("dragleave", () => button.classList.remove("is-drop-target"));
      button.addEventListener("drop", (event) => { event.preventDefault(); const moduleId = event.dataTransfer?.getData("text/plain") || ui.beyondFusionDrag?.moduleId; const index = Number(button.dataset.fusionSlot); const available = inventoryRows.find((row) => row.id === moduleId)?.free ?? 0; const placed = ui.beyondFusionSlots.filter((id) => id === moduleId).length; if (moduleId && !ui.beyondFusionSlots[index] && available > placed) { ui.beyondFusionSlots[index] = moduleId; ui.beyondFusionDrag = null; renderFusion(); } });
    });
    fusionGrid.querySelectorAll("[data-icon-module]").forEach((canvas) => paintModuleCanvas(canvas, getModuleById(canvas.dataset.iconModule), canvas.width));
    fusionRecipeList.innerHTML = `${recipes.map((module) => `<button type="button" class="beyond-fusion-recipe" data-fusion-recipe="${module.id}"><strong>${module.name}</strong><small>${rarityNames[module.rarity] ?? "模块"}</small><p>${module.fusionRecipe.map((item) => getModuleById(item.moduleId)?.name ?? item.moduleId).join(" ＋ ")}</p><em>点击设为目标配方</em></button>`).join("")}`;
    fusionRecipeList.querySelectorAll("[data-fusion-recipe]").forEach((button) => tap(button, () => { const targetModule = getModuleById(button.dataset.fusionRecipe); ui.beyondFusionTarget = button.dataset.fusionRecipe; ui.beyondFusionSlots = recipeMaterialsAvailable(targetModule) ? getFusionPreviewSlots(targetModule) : Array(9).fill(null); fusionMessage.textContent = recipeMaterialsAvailable(targetModule) ? `已自动放入${targetModule?.name ?? "目标配方"}所需材料，可直接合成。` : `已显示${targetModule?.name ?? "目标配方"}的虚影，请将材料拖入对应槽位。`; renderFusion(); }));
  };
  ui.showBeyondFusion = (data) => { setAnimatedVisibility(fusionResultModal, false); ui.beyondFusionMode = "synthesize"; ui.beyondFusionSlots = Array(9).fill(null); ui.beyondFusionSelected = null; ui.beyondFusionTarget = null; ui.hideAllScreens(); screen.classList.remove("is-hidden"); startPanel.classList.add("is-hidden"); runPanel.classList.add("is-hidden"); fusionPanel.classList.remove("is-hidden"); renderFusion(data); };
  ui.refreshBeyondFusion = (data, message = "") => { renderFusion(data); if (message) fusionMessage.textContent = message; };
  // 难度选择尚未创建航程，直接返回模式选择，避免触发航程放弃确认。
  ["pointerup", "touchend", "click"].forEach((eventName) => backButton?.addEventListener(eventName, leaveDifficultySelect, true));
  tap(modeButton, () => emit(ui, "beyond:open")); tap($("#beyond-new-run-button"), () => emit(ui, "beyond:new", { difficulty: ui.beyondSelectedDifficulty })); tap($("#beyond-load-button"), () => { setArchiveAction("import"); $("#beyond-save-input").value = ""; $("#beyond-save-message").textContent = "请粘贴航程存档码"; setAnimatedVisibility(saveModal, true); }); tap($("#beyond-save-button"), () => emit(ui, "beyond:save")); tap($("#beyond-build-button"), () => emit(ui, "beyond:build")); tap($("#beyond-fusion-button"), () => emit(ui, "beyond:fusion-open")); tap($("#beyond-fusion-back"), () => emit(ui, "beyond:fusion-close")); tap($("#beyond-fusion-recipes"), () => fusionRecipeList.classList.toggle("is-hidden")); $("#beyond-fusion-mode")?.querySelectorAll("[data-fusion-mode]").forEach((button) => tap(button, () => { ui.beyondFusionMode = button.dataset.fusionMode; ui.beyondFusionSelected = null; ui.beyondFusionTarget = null; ui.beyondFusionSlots = Array(9).fill(null); $("#beyond-fusion-mode").querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button)); renderFusion(); })); tap(fusionAction, () => emit(ui, ui.beyondFusionMode === "decompose" ? "beyond:decompose" : "beyond:fuse", ui.beyondFusionMode === "decompose" ? { moduleId: ui.beyondFusionSelected } : { slots: ui.beyondFusionSlots })); tap($("#beyond-back-button"), () => setAnimatedVisibility($("#beyond-exit-one"), true)); tap($("#beyond-node-close"), () => setAnimatedVisibility(nodePanel, false)); tap($("#beyond-node-action"), () => ui.beyondPendingNode && emit(ui, "beyond:node", { id: ui.beyondPendingNode.id })); tap($("#beyond-save-close"), () => setAnimatedVisibility(saveModal, false)); tap(saveCopy, async () => { try { await navigator.clipboard.writeText($("#beyond-save-input").value); $("#beyond-save-message").textContent = "航程存档码已复制"; } catch { $("#beyond-save-input").select(); document.execCommand?.("copy"); } }); tap(saveImport, () => emit(ui, "beyond:load", { code: $("#beyond-save-input").value })); tap($("#beyond-exit-one-cancel"), () => setAnimatedVisibility($("#beyond-exit-one"), false)); tap($("#beyond-exit-one-next"), () => { setAnimatedVisibility($("#beyond-exit-one"), false, () => setAnimatedVisibility($("#beyond-exit-two"), true)); }); tap($("#beyond-exit-two-cancel"), () => setAnimatedVisibility($("#beyond-exit-two"), false)); tap($("#beyond-exit-confirm"), () => emit(ui, "beyond:exit"));
  tap(resumeLocal, () => emit(ui, "beyond:resume-local"));
  tap(shopPanel.querySelector("[data-shop-close]"), () => setAnimatedVisibility(shopPanel, false, () => emit(ui, "beyond:shop-close")));
  const captureExitTap = (selector, handler) => {
    const button = $(selector);
    if (!button) return;
    let suppressClickUntil = 0;
    const invoke = (event) => {
      if (event.type === "pointerup" && event.pointerType !== "touch" && event.pointerType !== "pen" && event.button != null && event.button !== 0) return;
      if ((event.type === "touchend" || event.type === "click") && performance.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.type !== "click") suppressClickUntil = performance.now() + 600;
      handler();
    };
    ["pointerup", "touchend", "click"].forEach((eventName) => button.addEventListener(eventName, invoke, true));
  };
  const setExitDialogVisibility = (element, visible, after = null) => {
    if (!element) { after?.(); return; }
    if (visible) {
      if (!element.classList.contains("is-hidden")) return;
      element.classList.remove("is-hidden");
      return;
    }
    if (element.classList.contains("is-hidden")) { after?.(); return; }
    element.classList.add("is-hidden");
    element.classList.remove("is-closing", "is-opening");
    after?.();
  };
  captureExitTap("#beyond-back-button", () => { setAnimatedVisibility(exitBackdrop, true); setExitDialogVisibility($("#beyond-exit-one"), true); });
  captureExitTap("#beyond-exit-one-cancel", () => setExitDialogVisibility($("#beyond-exit-one"), false, () => setAnimatedVisibility(exitBackdrop, false)));
  captureExitTap("#beyond-exit-one-next", () => setExitDialogVisibility($("#beyond-exit-one"), false, () => setExitDialogVisibility($("#beyond-exit-two"), true)));
  captureExitTap("#beyond-exit-two-cancel", () => setExitDialogVisibility($("#beyond-exit-two"), false, () => setAnimatedVisibility(exitBackdrop, false)));
  captureExitTap("#beyond-exit-confirm", () => { exitBackdrop?.classList.add("is-hidden"); emit(ui, "beyond:exit"); });
  fusionPanel.querySelectorAll("[data-fusion-mode]").forEach((button) => tap(button, () => { ui.beyondFusionMode = button.dataset.fusionMode; ui.beyondFusionSelected = null; ui.beyondFusionTarget = null; ui.beyondFusionSlots = Array(9).fill(null); fusionPanel.querySelectorAll("[data-fusion-mode]").forEach((item) => item.classList.toggle("is-active", item === button)); renderFusion(); }));
  const clearFusionDropPreview = () => { fusionGrid.querySelectorAll(".beyond-fusion-drag-preview").forEach((node) => node.remove()); fusionGrid.querySelectorAll(".is-drop-target").forEach((node) => node.classList.remove("is-drop-target")); };
  const showFusionDropPreview = (target, moduleId) => {
    clearFusionDropPreview();
    const index = Number(target?.dataset.fusionSlot);
    const module = getModuleById(moduleId);
    if (!target || !module || !Number.isInteger(index) || ui.beyondFusionSlots[index]) return;
    const preview = document.createElement("span"); preview.className = "beyond-fusion-drag-preview"; preview.setAttribute("aria-hidden", "true");
    const canvas = document.createElement("canvas"); canvas.width = 48; canvas.height = 48; preview.append(canvas); target.append(preview); target.classList.add("is-drop-target"); paintModuleCanvas(canvas, module, 48);
  };
  fusionPanel.addEventListener("pointermove", (event) => { const drag = ui.beyondFusionDrag; if (!drag || ui.beyondFusionMode !== "synthesize") return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-fusion-slot]"); showFusionDropPreview(target, drag.moduleId); });
  fusionGrid.addEventListener("dragover", (event) => { const target = event.target.closest?.("[data-fusion-slot]"); const moduleId = event.dataTransfer?.getData("text/plain") || ui.beyondFusionDrag?.moduleId; if (target) { event.preventDefault(); showFusionDropPreview(target, moduleId); } });
  fusionPanel.addEventListener("dragend", clearFusionDropPreview);
  const finishFusionPointerDrag = (event) => {
    const drag = ui.beyondFusionDrag; if (!drag) return;
    clearFusionDropPreview();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-fusion-slot]");
    const targetIndex = target ? Number(target.dataset.fusionSlot) : -1;
    const rows = ui.beyondFusionData?.inventoryRows ?? []; const available = rows.find((row) => row.id === drag.moduleId)?.free ?? 0;
    const placed = ui.beyondFusionSlots.filter((id) => id === drag.moduleId).length;
    if (target && targetIndex >= 0 && !ui.beyondFusionSlots[targetIndex] && (drag.sourceIndex !== null || available > placed)) {
      const replaced = ui.beyondFusionSlots[targetIndex];
      if (drag.sourceIndex !== null) ui.beyondFusionSlots[drag.sourceIndex] = replaced ?? null;
      ui.beyondFusionSlots[targetIndex] = drag.moduleId; renderFusion();
    } else if (drag.sourceIndex !== null) {
      ui.beyondFusionSlots[drag.sourceIndex] = drag.moduleId; renderFusion();
    }
    ui.beyondFusionDrag = null;
  };
  fusionPanel.addEventListener("pointerdown", (event) => {
    if (ui.beyondFusionMode !== "synthesize") return;
    const source = event.target.closest?.("[data-fusion-input], [data-fusion-slot]"); if (!source || source.disabled) return;
    const moduleId = source.dataset.fusionInput ?? ui.beyondFusionSlots[Number(source.dataset.fusionSlot)]; if (!moduleId) return;
    const sourceIndex = source.dataset.fusionSlot === undefined ? null : Number(source.dataset.fusionSlot);
    if (sourceIndex !== null) ui.beyondFusionSlots[sourceIndex] = null;
    ui.beyondFusionDrag = { moduleId, sourceIndex }; source.classList.add("is-dragging"); event.preventDefault();
  });
  fusionPanel.addEventListener("pointerup", finishFusionPointerDrag, true);
  fusionPanel.addEventListener("pointercancel", finishFusionPointerDrag, true);
  map.addEventListener("pointerup", (event) => { const button = event.target.closest?.("[data-node]"); const node = ui.beyondRun?.map?.flat().find((item) => item.id === button?.dataset.node); if (!node || node.type !== "boss") return; requestAnimationFrame(() => { const reward = getModuleById(node.bossRewardId); $("#beyond-node-title").textContent = `✹ ${node.bossName ?? "首领"}`; $("#beyond-node-description").textContent = "这位首领守护着一件固定传说模块。击败它即可获得奖励并恢复满血。"; $("#beyond-node-rewards").textContent = `固定奖励：${reward?.name ?? "传说模块"}`; }); }, true);

  const hideExitOverlays = () => { clearTimeout(exitBackdrop?.__beyondAnimationTimer); exitBackdrop?.classList.add("is-hidden"); exitBackdrop?.classList.remove("is-closing", "is-opening"); $("#beyond-exit-one")?.classList.add("is-hidden"); $("#beyond-exit-one")?.classList.remove("is-closing", "is-opening"); $("#beyond-exit-two")?.classList.add("is-hidden"); $("#beyond-exit-two")?.classList.remove("is-closing", "is-opening"); };
  ui.showBeyondStart = () => { hideExitOverlays(); hideResult(); hideEvent(); setArchiveAction("import"); ui.hideAllScreens(); screen.classList.remove("is-hidden"); fusionPanel.classList.add("is-hidden"); startPanel.classList.remove("is-hidden"); runPanel.classList.add("is-hidden"); };
  ui.showBeyondRun = (run, available) => { hideExitOverlays(); hideResult(); hideEvent(); setArchiveAction("copy"); ui.beyondRun = run; ui.beyondBuilderMode = false; ui.hideAllScreens(); screen.classList.remove("is-hidden"); fusionPanel.classList.add("is-hidden"); startPanel.classList.add("is-hidden"); runPanel.classList.remove("is-hidden"); $("#beyond-hp").textContent = `${Math.round(run.hp)} / ${Math.round(BEYOND_LIGHT_CONE_CONFIG.maxPlayerHp)}`; $("#beyond-gold").textContent = run.gold; $("#beyond-difficulty").textContent = `Lv.${run.difficulty}`; $("#beyond-chapter").textContent = `${run.chapter ?? 1} / ${run.totalChapters ?? 1}`; $("#beyond-route-hint").textContent = available.length ? "选择与当前位置相连的下一处节点" : "航线已抵达终点"; nodePanel.classList.add("is-hidden"); renderMap(run, available); };
  ui.showBeyondBuilder = (run) => { hideExitOverlays(); if (!ui.beyondReturnLoadout) ui.beyondReturnLoadout = ui.loadout; ui.beyondRun = run; ui.beyondBuilderMode = true; ui.setHangarVisible?.(false); ui.loadout = createLoadout(run.loadout); ui.history = []; ui.hideAllScreens(); ui.builderScreen.classList.remove("is-hidden"); ui.builderSaveButton.textContent = "返回路线图"; ui.renderModuleLibrary(); ui.renderAssembly(); ui.setStatus("仅可使用本次航程库存中实际拥有的模块"); };
  ui.setBeyondSaveCode = (code, message = "已生成航程存档码", action = "copy") => { setArchiveAction(action); $("#beyond-save-input").value = code; $("#beyond-save-message").textContent = message; setAnimatedVisibility(saveModal, true); };
  ui.closeBeyondSave = () => setAnimatedVisibility(saveModal, false);
  ui.closeBeyondStageComplete = (after) => setAnimatedVisibility(ui.gameOverScreen, false, after);
  ui.showBeyondShop = (run, offers) => { setAnimatedVisibility(shopPanel, true); const list = shopPanel.querySelector(".beyond-shop-offers"); list.innerHTML = offers.map((offer, index) => `<button type="button" data-shop-offer="${index}" ${run.gold < offer.cost ? "disabled" : ""}><b>${getModuleById(offer.id)?.name ?? offer.id}</b><small>${offer.cost} 金币</small></button>`).join(""); list.querySelectorAll("[data-shop-offer]").forEach((button) => tap(button, () => emit(ui, "beyond:shop-buy", { index: Number(button.dataset.shopOffer) }))); };

  tap(resultContinue, () => { const action = ui.beyondPendingResultAction ?? "map"; setAnimatedVisibility(resultModal, false, () => emit(ui, "beyond:result-continue", { action })); });
  tap($("#beyond-fusion-result-close"), () => setAnimatedVisibility(fusionResultModal, false));
  ui.showBeyondFusionResult = (module) => { if (!module) return; ui.beyondFusionSlots = Array(9).fill(null); ui.beyondFusionTarget = null; renderFusion(); const icon = $("#beyond-fusion-result-icon"); const name = $("#beyond-fusion-result-name"); if (icon) paintModuleCanvas(icon, module, icon.width); if (name) name.textContent = module.name; setAnimatedVisibility(fusionResultModal, true); };
  tap(completeExit, () => setAnimatedVisibility(completeModal, false, () => emit(ui, "beyond:complete-exit")));

  function renderMap(run, available) {
    // 只渲染节点层本身。层与层之间的装饰横线会制造出看似无意义的连线，
    // 路线关系统一交给下面的 SVG 绘制。
    map.innerHTML = run.map.map((layer) => `<div class="beyond-map-layer">${layer.map((node) => { const info = BEYOND_LIGHT_CONE_CONFIG.nodeTypes[node.type]; const canVisit = available.some((entry) => entry.id === node.id); const visited = run.visited.includes(node.id); return `<button type="button" class="beyond-node ${canVisit ? "is-available" : ""} ${visited ? "is-visited" : ""}" data-node="${node.id}"><b>${info.icon}</b><small>${info.name}</small></button>`; }).join("")}</div>`).join("");
    // Use the actual rendered node centers instead of guessing positions from lane/layer.
    // The map is scrollable, so the route SVG must use the full scroll height as well.
    const allNodes = run.map.flat();
    const nodeById = new Map(allNodes.map((node) => [node.id, node]));
    const buttonById = new Map([...map.querySelectorAll("[data-node]")].map((button) => [button.dataset.node, button]));
    const mapRect = map.getBoundingClientRect();
    const locations = new Map([...buttonById.entries()].map(([id, button]) => {
      const rect = button.getBoundingClientRect();
      return [id, {
        x: rect.left - mapRect.left + map.scrollLeft + rect.width / 2,
        y: rect.top - mapRect.top + map.scrollTop + rect.height / 2,
      }];
    }));
    const routeOrigins = run.currentNodeId
      ? [nodeById.get(run.currentNodeId)].filter(Boolean)
      : [];
    const availableIds = new Set(available.map((node) => node.id));
    const allLines = allNodes.flatMap((node) => node.edges.map((id) => [node, nodeById.get(id)]))
      .filter(([from, to]) => from && to)
      .map(([from, to]) => {
        const start = locations.get(from.id); const end = locations.get(to.id);
        return start && end ? `<path class="is-route" d="M ${start.x} ${start.y} L ${end.x} ${end.y}"/>` : "";
      })
      .join("");
    const lines = routeOrigins.flatMap((node) => node.edges.map((id) => [node, nodeById.get(id)]))
      .filter(([from, to]) => from && to && availableIds.has(to.id))
      .map(([from, to]) => {
        const start = locations.get(from.id); const end = locations.get(to.id);
        return start && end ? `<path class="is-available-route" d="M ${start.x} ${start.y} L ${end.x} ${end.y}"/>` : "";
      })
      .join("");
    // Before the first node is entered, connect the hidden expedition start
    // point to every available node so the first choice is also readable.
    const initialLines = !run.currentNodeId && available.length
      ? available.map((node) => {
        const end = locations.get(node.id);
        if (!end) return "";
        const start = { x: map.clientWidth / 2, y: Math.max(8, end.y - 62) };
        return `<path class="is-available-route" d="M ${start.x} ${start.y} L ${end.x} ${end.y}"/>`;
      }).join("")
      : "";
    const routeMarkup = allLines + lines + initialLines;
    const routeWidth = Math.max(map.clientWidth, map.scrollWidth);
    const routeHeight = Math.max(map.clientHeight, map.scrollHeight);
    map.insertAdjacentHTML("afterbegin", `<svg class="beyond-map-routes" style="left:0;top:0;width:${routeWidth}px;height:${routeHeight}px" viewBox="0 0 ${routeWidth} ${routeHeight}" preserveAspectRatio="none" aria-hidden="true">${routeMarkup}</svg>`);
    map.querySelectorAll("[data-node]").forEach((button) => tap(button, () => { const node = run.map.flat().find((entry) => entry.id === button.dataset.node); if (!available.some((entry) => entry.id === node?.id)) return; ui.beyondPendingNode = node; const info = BEYOND_LIGHT_CONE_CONFIG.nodeTypes[node.type]; $("#beyond-node-tag").textContent = info.name; $("#beyond-node-title").textContent = `${info.icon} ${info.name}`; $("#beyond-node-description").textContent = node.type === "boss" ? "地图顶端的首领正在等待。击败它即可完成本次航程。" : node.type === "elite" ? "高风险精英战斗，胜利后获得高品质模块。" : node.type === "combat" ? "击败敌人后获得模块与金币。" : node.type === "shop" ? "消耗金币购买模块。" : node.type === "event" ? "探索未知信号，可能获得奖励或触发战斗。" : node.type === "rest" ? "恢复机体生命值。" : ""; $("#beyond-node-rewards").textContent = node.type === "elite" ? "奖励：高品质模块 × 2" : node.type === "boss" ? "奖励：传说模块 × 2" : node.type === "combat" ? "奖励：模块 × 1、金币" : "无战斗遭遇"; $("#beyond-node-action").textContent = ["combat", "elite", "boss"].includes(node.type) ? "进入战斗" : "进入节点"; setAnimatedVisibility(nodePanel, true); }));
  }
}
