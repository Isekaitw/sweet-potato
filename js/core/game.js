import { createGameState } from "./state.js";
import { emit } from "./events.js";
import { updateScoreDisplay } from "../systems/score.js";

let state;

export function initGame() {
  state = createGameState();
  updateScoreDisplay(state.score);
  emit("game:start", state);
  return state;
}

export function getGameState() { return state; }
