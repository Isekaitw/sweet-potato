export function getLevelForScore(score, pointsPerLevel = 100) {
  return Math.max(1, Math.floor(score / pointsPerLevel) + 1);
}
