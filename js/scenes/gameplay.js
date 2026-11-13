// Gameplay scene: add game-specific rendering and update logic here.
export function renderGameplay(container, state) {
  container.textContent = `目前分數：${state.score}`;
}
