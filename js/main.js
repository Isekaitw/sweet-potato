import { PotatoGame } from "./systems/game-engine.js";
import { loadBackground, saveBackground } from "./core/background-storage.js";

const canvas = document.querySelector("#game-canvas");
const fileInput = document.querySelector("#background-file");
const changeBackgroundButton = document.querySelector("#change-background");
const hint = document.querySelector("#hint");
const game = new PotatoGame(canvas);

function showHint(message, isError = false) {
  hint.textContent = message;
  hint.classList.toggle("error", isError);
  window.clearTimeout(showHint.timer);
  showHint.timer = window.setTimeout(() => {
    hint.textContent = "點擊畫面投擲地瓜，按住可連續投擲";
    hint.classList.remove("error");
  }, 2800);
}

async function applyBackgroundFile(file) {
  if (!file) return;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    showHint("請選擇 JPG、PNG 或 WebP 圖片", true);
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showHint("圖片大小不可超過 10 MB", true);
    return;
  }
  try {
    const image = await createImageBitmap(file);
    await saveBackground(file);
    game.setBackground(image);
    showHint("背景已更換並保存");
  } catch (error) {
    console.error(error);
    showHint("圖片讀取或保存失敗，請再試一次", true);
  }
}

changeBackgroundButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", event => {
  applyBackgroundFile(event.target.files?.[0]);
  fileInput.value = "";
});

try {
  const savedImage = await loadBackground();
  if (savedImage) game.setBackground(await createImageBitmap(savedImage));
} catch (error) {
  console.warn("無法讀取已保存的背景圖片。", error);
}
game.start();
