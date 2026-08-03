import { GAME_CONFIG } from "./config/game-config.js";
import { InputSystem } from "./systems/InputSystem.js";
import { UI } from "./ui/UI.js";
import { Game } from "./core/Game.js";

const canvas = document.querySelector("#game-canvas");
const ui = new UI();
const input = new InputSystem(canvas, GAME_CONFIG.canvas);
window.__neonBoot?.setProgress(78, "正在初始化界面与操作系统…");
new Game({ canvas, input, ui });
window.__neonBoot?.setProgress(96, "正在完成最后检查…");
window.__neonUiReady = true;
window.__neonFinishBoot?.();
for (const id of window.__neonPendingTaps ?? []) document.getElementById(id)?.click();
window.__neonPendingTaps = [];
