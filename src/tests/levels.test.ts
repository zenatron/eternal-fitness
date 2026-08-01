import { describe, test, expect } from 'bun:test';
import {
  getLevel,
  getXPForLevel,
  getXPForNextLevel,
  getLevelProgress,
  getLevelTitle,
} from '@/utils/levels';

/**
 * Levelling is a quadratic curve: level N starts at (N-1)^2 * 25 points.
 * These are worth pinning because the curve is displayed on the profile and on
 * every victory screen, and because points only ever accumulate — a bug here
 * cannot self-correct.
 */

describe('getLevel', () => {
  test('starts at level 1, not 0', () => {
    expect(getLevel(0)).toBe(1);
    expect(getLevel(1)).toBe(1);
    expect(getLevel(24)).toBe(1);
  });

  test('crosses at the documented thresholds', () => {
    // (N-1)^2 * 25
    expect(getLevel(25)).toBe(2);
    expect(getLevel(99)).toBe(2);
    expect(getLevel(100)).toBe(3);
    expect(getLevel(225)).toBe(4);
    expect(getLevel(2500)).toBe(11);
  });

  test('never returns below 1, even for negative points', () => {
    expect(getLevel(-1)).toBe(1);
    expect(getLevel(-100000)).toBe(1);
  });

  test('is monotonic across the realistic range', () => {
    let previous = getLevel(0);
    for (let points = 0; points <= 300_000; points += 137) {
      const level = getLevel(points);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });
});

describe('getXFForLevel / getLevel round trip', () => {
  test('the XP for a level is exactly enough to be that level', () => {
    for (let level = 1; level <= 120; level++) {
      const threshold = getXPForLevel(level);
      expect(getLevel(threshold)).toBe(level);
      // And one point short is the level below (except at level 1, the floor).
      if (level > 1) expect(getLevel(threshold - 1)).toBe(level - 1);
    }
  });

  test('levels 0 and 1 both cost nothing', () => {
    expect(getXPForLevel(0)).toBe(0);
    expect(getXPForLevel(1)).toBe(0);
  });
});

describe('getXPForNextLevel', () => {
  test('reports the points still needed, not the next threshold', () => {
    // Level 2 starts at 25, so at 0 points you need 25 more.
    expect(getXPForNextLevel(0)).toBe(25);
    expect(getXPForNextLevel(24)).toBe(1);
    // At exactly 25 you are level 2, and level 3 starts at 100.
    expect(getXPForNextLevel(25)).toBe(75);
  });

  test('is always positive', () => {
    for (let points = 0; points <= 50_000; points += 313) {
      expect(getXPForNextLevel(points)).toBeGreaterThan(0);
    }
  });
});

describe('getLevelProgress', () => {
  test('sits at 0% on a level boundary', () => {
    const p = getLevelProgress(25);
    expect(p.currentLevel).toBe(2);
    expect(p.currentLevelXP).toBe(25);
    expect(p.nextLevelXP).toBe(100);
    expect(p.progressInLevel).toBe(0);
    expect(p.percent).toBe(0);
  });

  test('reports partial progress within a level', () => {
    // Level 2 spans 25..100, so 62 is 37/75 through it.
    const p = getLevelProgress(62);
    expect(p.currentLevel).toBe(2);
    expect(p.progressInLevel).toBe(37);
    expect(p.percent).toBe(Math.round((37 / 75) * 100));
  });

  test('percent stays within 0-100 across the range', () => {
    for (let points = 0; points <= 100_000; points += 97) {
      const p = getLevelProgress(points);
      expect(p.percent).toBeGreaterThanOrEqual(0);
      expect(p.percent).toBeLessThanOrEqual(100);
      expect(p.progressInLevel).toBeGreaterThanOrEqual(0);
    }
  });

  test('handles zero and negative points without going backwards', () => {
    expect(getLevelProgress(0).currentLevel).toBe(1);
    expect(getLevelProgress(0).percent).toBe(0);
    const negative = getLevelProgress(-50);
    expect(negative.currentLevel).toBe(1);
    expect(negative.percent).toBeGreaterThanOrEqual(0);
  });
});

describe('getLevelTitle', () => {
  test('picks the highest threshold at or below the level', () => {
    expect(getLevelTitle(1)).toBe('Beginner');
    expect(getLevelTitle(4)).toBe('Beginner');
    expect(getLevelTitle(5)).toBe('Novice');
    expect(getLevelTitle(14)).toBe('Trainee');
    expect(getLevelTitle(100)).toBe('Mythic');
    expect(getLevelTitle(999)).toBe('Mythic');
  });

  test('degrades to Beginner below the first threshold', () => {
    expect(getLevelTitle(0)).toBe('Beginner');
    expect(getLevelTitle(-5)).toBe('Beginner');
  });

  test('never returns empty', () => {
    for (let level = 0; level <= 150; level++) {
      expect(getLevelTitle(level).length).toBeGreaterThan(0);
    }
  });
});
