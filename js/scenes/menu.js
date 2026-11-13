export function initMenu({ showScreen, startGame }) {
  document.querySelector("#start-button").addEventListener("click", startGame);
  document.querySelector("#settings-button").addEventListener("click", () => showScreen("settings"));
}
