const XP_PER_LEVEL_BASE = 25;

export function getLevel(points: number): number {
  if (points < 0) return 1;
  return Math.floor(Math.sqrt(points / XP_PER_LEVEL_BASE)) + 1;
}

export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) * (level - 1) * XP_PER_LEVEL_BASE;
}

export function getXPForNextLevel(points: number): number {
  const currentLevel = getLevel(points);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  return nextLevelXP - points;
}

export function getLevelProgress(points: number): {
  currentLevel: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressInLevel: number;
  percent: number;
} {
  const currentLevel = getLevel(points);
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  /*
   * Clamped at zero. getLevel() floors a negative balance at level 1, but this
   * function did not floor the points, so -50 points produced progressInLevel
   * of -50 and a percent of -200 — rendering an inverted progress bar. Points
   * should never go negative, but this is what draws the bar and it should not
   * be the thing that turns a data problem into a visual one.
   */
  const progressInLevel = Math.max(0, points - currentLevelXP);
  const range = nextLevelXP - currentLevelXP;
  const percent =
    range > 0 ? Math.max(0, Math.min(100, Math.round((progressInLevel / range) * 100))) : 100;
  return { currentLevel, currentLevelXP, nextLevelXP, progressInLevel, percent };
}

const LEVEL_TITLES: Record<number, string> = {
  1: 'Beginner',
  5: 'Novice',
  10: 'Trainee',
  15: 'Athlete',
  20: 'Elite',
  25: 'Warrior',
  30: 'Champion',
  40: 'Master',
  50: 'Grandmaster',
  75: 'Legend',
  100: 'Mythic',
};

export function getLevelTitle(level: number): string {
  const thresholds = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const threshold of thresholds) {
    if (level >= threshold) return LEVEL_TITLES[threshold];
  }
  return 'Beginner';
}
