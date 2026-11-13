import { CONFIG } from "../config.js";

export function getBestScore() {
  return Number(localStorage.getItem(CONFIG.storageKeys.bestScore) || 0);
}
export function saveBestScore(score) {
  if (score > getBestScore()) localStorage.setItem(CONFIG.storageKeys.bestScore, String(score));
}
export function getSoundEnabled() {
  return localStorage.getItem(CONFIG.storageKeys.sound) !== "false";
}
export function setSoundEnabled(enabled) {
  localStorage.setItem(CONFIG.storageKeys.sound, String(enabled));
}
