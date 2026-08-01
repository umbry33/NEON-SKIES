import { GAME_CONFIG } from "./config/game-config.js";
import { InputSystem } from "./systems/InputSystem.js";
import { UI } from "./ui/UI.js";
import { Game } from "./core/Game.js";

const canvas = document.querySelector("#game-canvas");
const ui = new UI();
const input = new InputSystem(canvas, GAME_CONFIG.canvas);
new Game({ canvas, input, ui });
