import { describe, test, expect } from 'bun:test';
import {
  calculatePlates,
  loadingFor,
  formatPerSide,
  plateSet,
  PLATES_KG,
  PLATES_LB,
  findBar,
  barWeight,
  BAR_OPTIONS,
} from '@/utils/plates';

describe('calculatePlates', () => {
  test('loads a standard kg target exactly', () => {
    // 100kg on a 20kg bar = 40kg per side = 25 + 15
    const l = calculatePlates(100, 20, PLATES_KG);
    expect(l.exact).toBe(true);
    expect(l.achieved).toBe(100);
    expect(l.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
  });

  test('loads a standard lb target exactly', () => {
    // 225lb on a 45lb bar = 90lb per side = two 45s
    const l = calculatePlates(225, 45, PLATES_LB);
    expect(l.exact).toBe(true);
    expect(l.perSide).toEqual([{ plate: 45, count: 2 }]);
  });

  test('uses multiples of the heaviest plate before stepping down', () => {
    // 240kg on a 20kg bar = 110 per side = 4x25 + 10
    const l = calculatePlates(240, 20, PLATES_KG);
    expect(l.exact).toBe(true);
    expect(l.perSide).toEqual([
      { plate: 25, count: 4 },
      { plate: 10, count: 1 },
    ]);
  });

  test('an empty bar loads nothing and is exact', () => {
    const l = calculatePlates(20, 20, PLATES_KG);
    expect(l.perSide).toEqual([]);
    expect(l.exact).toBe(true);
    expect(l.belowBar).toBe(false);
    expect(formatPerSide(l)).toBe('Empty bar');
  });

  test('flags a target below the bar rather than returning nonsense', () => {
    const l = calculatePlates(15, 20, PLATES_KG);
    expect(l.belowBar).toBe(true);
    expect(l.perSide).toEqual([]);
    expect(l.achieved).toBe(20);
  });

  test('reports the shortfall when a target is not loadable', () => {
    // 101kg needs 40.5 per side; the smallest plate is 1.25, so 40.0 is the
    // closest reachable from below -> 100kg, 1kg short.
    const l = calculatePlates(101, 20, PLATES_KG);
    expect(l.exact).toBe(false);
    expect(l.achieved).toBe(100);
    expect(l.delta).toBe(-1);
  });

  test('half-plate targets resolve without floating point drift', () => {
    // 102.5kg = 41.25 per side = 25 + 15 + 1.25
    const l = calculatePlates(102.5, 20, PLATES_KG);
    expect(l.exact).toBe(true);
    expect(l.achieved).toBe(102.5);
    expect(l.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
      { plate: 1.25, count: 1 },
    ]);
  });

  test('accumulated subtraction stays exact across many small plates', () => {
    // 20 + 2*(2.5 + 1.25) = 27.5, all in binary-awkward fractions
    const l = calculatePlates(27.5, 20, PLATES_KG);
    expect(l.exact).toBe(true);
    expect(l.delta).toBe(0);
  });

  test('respects a limited rack', () => {
    // 140kg on a 20kg bar is 60 per side. With only one 25 available it falls
    // through to 20 and 15 rather than stacking a second 25.
    const l = calculatePlates(140, 20, PLATES_KG, { 25: 1 });
    expect(l.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 20, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(l.exact).toBe(true);
  });

  test('falls short gracefully when the rack runs out', () => {
    const l = calculatePlates(300, 20, PLATES_KG, { 25: 1, 20: 1, 15: 0, 10: 0, 5: 0, 2.5: 0, 1.25: 0 });
    expect(l.exact).toBe(false);
    expect(l.achieved).toBe(110);
    expect(l.delta).toBeLessThan(0);
  });

  test('handles non-finite and non-positive targets', () => {
    for (const bad of [0, -50, Number.NaN, Number.POSITIVE_INFINITY]) {
      const l = calculatePlates(bad, 20, PLATES_KG);
      expect(l.perSide).toEqual([]);
    }
  });

  test('never overshoots the target', () => {
    // Greedy from above would be a real bug: loading more than asked is worse
    // than loading less, because the lifter may not notice.
    for (let target = 20; target <= 300; target += 0.25) {
      const l = calculatePlates(target, 20, PLATES_KG);
      expect(l.achieved).toBeLessThanOrEqual(target + 1e-6);
    }
  });

  test('every exact loading actually sums back to the target', () => {
    for (let target = 20; target <= 400; target += 1.25) {
      const l = calculatePlates(target, 20, PLATES_KG);
      const sum = 20 + 2 * l.perSide.reduce((s, p) => s + p.plate * p.count, 0);
      expect(Math.abs(sum - l.achieved)).toBeLessThan(1e-6);
      if (l.exact) expect(Math.abs(sum - target)).toBeLessThan(1e-6);
    }
  });

  test('is always within one small plate of the target when loadable', () => {
    // The smallest kg plate is 1.25 per side = 2.5 total, so no reachable
    // target should ever miss by more than that.
    for (let target = 22.5; target <= 300; target += 0.25) {
      const l = calculatePlates(target, 20, PLATES_KG);
      expect(Math.abs(l.delta)).toBeLessThan(2.5);
    }
  });
});

describe('bars and plate sets', () => {
  test('unknown bar ids fall back to the olympic bar', () => {
    expect(findBar('nope').id).toBe('olympic');
    expect(findBar(null).id).toBe('olympic');
    expect(findBar(undefined).id).toBe('olympic');
  });

  test('bar weights are per-unit, not converted', () => {
    const olympic = findBar('olympic');
    expect(barWeight(olympic, true)).toBe(20);
    expect(barWeight(olympic, false)).toBe(45);
  });

  test('every bar option is defined in both units', () => {
    for (const bar of BAR_OPTIONS) {
      expect(Number.isFinite(bar.kg)).toBe(true);
      expect(Number.isFinite(bar.lb)).toBe(true);
    }
  });

  test('plate sets are strictly descending, which greedy relies on', () => {
    for (const set of [PLATES_KG, PLATES_LB]) {
      for (let i = 1; i < set.length; i++) expect(set[i]).toBeLessThan(set[i - 1]);
    }
  });

  test('plateSet follows the unit preference', () => {
    expect(plateSet(true)).toBe(PLATES_KG);
    expect(plateSet(false)).toBe(PLATES_LB);
  });

  test('loadingFor wires units and bar together', () => {
    expect(loadingFor(225, 'olympic', false).exact).toBe(true);
    expect(loadingFor(100, 'olympic', true).exact).toBe(true);
    // "No bar" means the whole target is plates.
    expect(loadingFor(50, 'none', true).achieved).toBe(50);
  });
});

describe('formatPerSide', () => {
  test('expands counts into repeated plates, heaviest first', () => {
    expect(formatPerSide(calculatePlates(225, 45, PLATES_LB))).toBe('45 + 45');
    expect(formatPerSide(calculatePlates(102.5, 20, PLATES_KG))).toBe('25 + 15 + 1.25');
  });
});
