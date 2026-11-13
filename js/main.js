import { initGame } from "./core/game.js";
import { getBestScore } from "./core/storage.js";
import { initMenu } from "./scenes/menu.js";
import { initSettings } from "./scenes/settings.js";

const screens = {
  menu: document.querySelector("#menu-screen"),
  game: document.querySelector("#game-screen"),
  settings: document.querySelector("#settings-screen")
};

export function showScreen(name) {
  for ( (const [key, element]) of Object.entries(screens)) {
    element.hidden = key !== name;
  }
}

document.querySelector("#best-score").textContent = `最高分：${getBestScore()}`;
initMenu({ showScreen, startGame: () => { showScreen("game"); initGame(); } });
initSettings({ showScreen });
document.querySelector("#back-button").addEventListener("click", () => showScreen("menu"));
showScreen("menu");
