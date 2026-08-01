import { describe, test, expect } from 'bun:test';
import {
  estimateOneRepMax,
  bestOneRepMax,
  formatOneRepMax,
  MAX_REPS_FOR_ESTIMATE,
} from '@/utils/oneRepMax';

describe('estimateOneRepMax', () => {
  test('a single rep is its own max, unadjusted', () => {
    // Epley alone would return 103.3 here, which would let a true 1RM look
    // like a 3% improvement on itself.
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  test('sits between the two source formulas', () => {
    const w = 100;
    const reps = 5;
    const epley = w * (1 + reps / 30);
    const brzycki = w * (36 / (37 - reps));
    const estimate = estimateOneRepMax(w, reps)!;
    expect(estimate).toBeGreaterThan(Math.min(epley, brzycki));
    expect(estimate).toBeLessThan(Math.max(epley, brzycki));
  });

  test('5x100kg lands between Epley (116.7) and Brzycki (112.5)', () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(114.58, 2);
  });

  test('increases with reps at a fixed weight', () => {
    let prev = 0;
    for (let reps = 1; reps <= MAX_REPS_FOR_ESTIMATE; reps++) {
      const e = estimateOneRepMax(100, reps)!;
      expect(e).toBeGreaterThan(prev);
      prev = e;
    }
  });

  test('increases with weight at a fixed rep count', () => {
    expect(estimateOneRepMax(105, 5)!).toBeGreaterThan(estimateOneRepMax(100, 5)!);
  });

  test('is always at least the weight actually lifted', () => {
    for (let reps = 1; reps <= MAX_REPS_FOR_ESTIMATE; reps++) {
      expect(estimateOneRepMax(80, reps)!).toBeGreaterThanOrEqual(80);
    }
  });

  test('refuses rep counts past the useful range', () => {
    expect(estimateOneRepMax(100, MAX_REPS_FOR_ESTIMATE)).not.toBeNull();
    expect(estimateOneRepMax(100, MAX_REPS_FOR_ESTIMATE + 1)).toBeNull();
    // Brzycki's denominator hits zero at 37 reps; the cap keeps that
    // unreachable rather than returning Infinity.
    expect(estimateOneRepMax(100, 37)).toBeNull();
    expect(estimateOneRepMax(100, 50)).toBeNull();
  });

  test('refuses unusable input', () => {
    expect(estimateOneRepMax(0, 5)).toBeNull();
    expect(estimateOneRepMax(-100, 5)).toBeNull();
    expect(estimateOneRepMax(100, 0)).toBeNull();
    expect(estimateOneRepMax(100, -3)).toBeNull();
    expect(estimateOneRepMax(Number.NaN, 5)).toBeNull();
    expect(estimateOneRepMax(100, Number.NaN)).toBeNull();
    expect(estimateOneRepMax(Number.POSITIVE_INFINITY, 5)).toBeNull();
  });

  test('a heavier low-rep set can still lose to a lighter high-rep set', () => {
    // The whole reason for tracking e1RM: 5x100 beats 1x105.
    expect(estimateOneRepMax(100, 5)!).toBeGreaterThan(estimateOneRepMax(105, 1)!);
  });
});

describe('bestOneRepMax', () => {
  const set = (w: number, r: number, extra = {}) => ({
    actualWeight: w,
    actualReps: r,
    completed: true,
    ...extra,
  });

  test('picks the best set and reports where it came from', () => {
    // 100x5 -> 114.58, 105x1 -> 105.00, 90x8 -> 112.86
    const best = bestOneRepMax([set(100, 5), set(105, 1), set(90, 8)])!;
    expect(best.weight).toBe(100);
    expect(best.reps).toBe(5);
    expect(best.oneRepMax).toBeCloseTo(estimateOneRepMax(100, 5)!, 6);
  });

  test('ignores incomplete and skipped sets', () => {
    const best = bestOneRepMax([
      set(100, 5),
      set(200, 5, { completed: false }),
      set(300, 5, { skipped: true }),
    ])!;
    expect(best.weight).toBe(100);
  });

  test('returns null when nothing qualifies', () => {
    expect(bestOneRepMax([])).toBeNull();
    expect(bestOneRepMax([set(0, 10)])).toBeNull();
    expect(bestOneRepMax([set(100, 30)])).toBeNull();
    expect(bestOneRepMax([{ completed: true }])).toBeNull();
  });

  test('tolerates missing fields', () => {
    expect(bestOneRepMax([{ actualWeight: 100, completed: true }])).toBeNull();
    expect(bestOneRepMax([{ actualReps: 5, completed: true }])).toBeNull();
  });
});

describe('formatOneRepMax', () => {
  test('drops a meaningless trailing zero', () => {
    expect(formatOneRepMax(100, true)).toBe('100 kg');
    expect(formatOneRepMax(100.04, true)).toBe('100 kg');
  });

  test('keeps one decimal where it distinguishes two sets', () => {
    expect(formatOneRepMax(112.83, true)).toBe('112.8 kg');
    expect(formatOneRepMax(112.83, false)).toBe('112.8 lb');
  });
});
