export function updateScoreDisplay(score) {
  const display = document.querySelector("#score-display");
  if (display) display.textContent = `分數：${score}`;
}
