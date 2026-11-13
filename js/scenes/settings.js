import { getSoundEnabled, setSoundEnabled } from "../core/storage.js";

export function initSettings({ showScreen }) {
  const toggle = document.querySelector("#sound-toggle");
  toggle.checked = getSoundEnabled();
  toggle.addEventListener("change", () => setSoundEnabled(toggle.checked));
  document.querySelector("#settings-back-button").addEventListener("click", () => showScreen("menu"));
}
