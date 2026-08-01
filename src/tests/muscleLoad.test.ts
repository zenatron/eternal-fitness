import { describe, test, expect } from 'bun:test';
import {
  BODY_REGIONS,
  REGION_META,
  regionsForMuscle,
  regionsInView,
  isBodyRegion,
} from '@/lib/muscleRegions';
import { muscleGroups } from '@/lib/muscleGroups';
import { exercises } from '@/lib/exercises';
import {
  computeRegionLoad,
  emptyRegionLoad,
  positionWeight,
  rpeScale,
  setStimulus,
  sumRegionLoads,
} from '@/utils/muscleLoad';

const completed = (extra: Record<string, unknown> = {}) => ({
  completed: true,
  actualReps: 10,
  actualWeight: 60,
  ...extra,
});

describe('muscle to region mapping', () => {
  test('every muscle group in the type union maps somewhere', () => {
    const unmapped = muscleGroups.filter((m) => Object.keys(regionsForMuscle(m)).length === 0);
    expect(unmapped).toEqual([]);
  });

  test('every muscle used by the exercise library maps somewhere', () => {
    // The library is the real source of truth; a muscle it uses that the map
    // does not know about silently drops that exercise off the heatmap.
    const used = new Set<string>();
    for (const exercise of Object.values(exercises)) {
      for (const muscle of exercise.muscles ?? []) used.add(muscle);
    }
    const unmapped = [...used].filter((m) => Object.keys(regionsForMuscle(m)).length === 0);
    expect(unmapped).toEqual([]);
  });

  test('weights within a mapping sum to 1', () => {
    // Otherwise a broad group like "Legs" would credit more or less total load
    // than a specific one, purely because of how it was described.
    for (const muscle of muscleGroups) {
      const regions = regionsForMuscle(muscle);
      const total = Object.values(regions).reduce((s, w) => s + (w ?? 0), 0);
      expect(total).toBeCloseTo(1, 6);
    }
  });

  test('every mapped target is a real region', () => {
    for (const muscle of muscleGroups) {
      for (const region of Object.keys(regionsForMuscle(muscle))) {
        expect(isBodyRegion(region)).toBe(true);
      }
    }
  });

  test('an unknown muscle maps to nothing rather than throwing', () => {
    expect(regionsForMuscle('Gills')).toEqual({});
    expect(regionsForMuscle('')).toEqual({});
  });

  test('every region has presentation metadata', () => {
    for (const region of BODY_REGIONS) {
      expect(REGION_META[region].label.length).toBeGreaterThan(0);
      expect(['front', 'back', 'both']).toContain(REGION_META[region].view);
      expect(['large', 'medium', 'small']).toContain(REGION_META[region].size);
    }
  });

  test('both views together cover every region', () => {
    const covered = new Set([...regionsInView('front'), ...regionsInView('back')]);
    expect(covered.size).toBe(BODY_REGIONS.length);
  });
});

describe('setStimulus', () => {
  test('a completed set is worth one effective set by default', () => {
    expect(setStimulus(completed())).toBe(1);
  });

  test('skipped and unfinished sets are worth nothing', () => {
    expect(setStimulus(completed({ completed: false }))).toBe(0);
    expect(setStimulus(completed({ skipped: true }))).toBe(0);
  });

  test('an empty placeholder set is worth nothing', () => {
    expect(setStimulus({ completed: true })).toBe(0);
    expect(setStimulus({ completed: true, actualReps: 0, actualWeight: 0 })).toBe(0);
  });

  test('bodyweight and cardio sets still count', () => {
    // The reason load is measured in sets rather than volume.
    expect(setStimulus({ completed: true, actualReps: 12 })).toBe(1);
    expect(setStimulus({ completed: true, actualDuration: 1800 })).toBe(1);
  });

  test('RPE scales the set, with 8 as the reference', () => {
    expect(rpeScale(8)).toBe(1);
    expect(rpeScale(10)).toBeGreaterThan(1);
    expect(rpeScale(5)).toBeLessThan(1);
  });

  test('a mis-entered RPE cannot dominate the map', () => {
    expect(rpeScale(1000)).toBeLessThanOrEqual(1.25);
    expect(rpeScale(0.0001)).toBeGreaterThanOrEqual(0.5);
    expect(rpeScale(-5)).toBe(1);
    expect(rpeScale(Number.NaN)).toBe(1);
    expect(rpeScale(undefined)).toBe(1);
  });
});

describe('positionWeight', () => {
  test('the prime mover takes full credit', () => {
    expect(positionWeight(0)).toBe(1);
  });

  test('assistors fall off but never to zero', () => {
    let previous = positionWeight(0);
    for (let i = 1; i < 8; i++) {
      const w = positionWeight(i);
      expect(w).toBeLessThanOrEqual(previous);
      expect(w).toBeGreaterThan(0);
      previous = w;
    }
  });
});

describe('computeRegionLoad', () => {
  test('credits the prime mover more than the assistors', () => {
    const load = computeRegionLoad([
      { exerciseKey: 'Bench Press', sets: [completed(), completed(), completed()] },
    ]);
    expect(load.chest).toBeGreaterThan(load.triceps);
    expect(load.triceps).toBeGreaterThan(0);
    expect(load.shoulders).toBeGreaterThan(0);
  });

  test('scales linearly with completed sets', () => {
    const one = computeRegionLoad([{ exerciseKey: 'Bench Press', sets: [completed()] }]);
    const three = computeRegionLoad([
      { exerciseKey: 'Bench Press', sets: [completed(), completed(), completed()] },
    ]);
    expect(three.chest).toBeCloseTo(one.chest * 3, 6);
  });

  test('ignores skipped sets entirely', () => {
    const load = computeRegionLoad([
      {
        exerciseKey: 'Bench Press',
        sets: [completed(), completed({ skipped: true }), completed({ completed: false })],
      },
    ]);
    const single = computeRegionLoad([{ exerciseKey: 'Bench Press', sets: [completed()] }]);
    expect(load.chest).toBeCloseTo(single.chest, 6);
  });

  test('an exercise outside the library contributes nothing unless muscles are supplied', () => {
    expect(computeRegionLoad([{ exerciseKey: 'Underwater Basket Weaving', sets: [completed()] }]))
      .toEqual(emptyRegionLoad());

    const explicit = computeRegionLoad([
      { exerciseKey: 'Underwater Basket Weaving', sets: [completed()], muscles: ['Lats'] },
    ]);
    expect(explicit.lats).toBeGreaterThan(0);
  });

  test('broad muscle groups spread across regions', () => {
    const load = computeRegionLoad([
      { exerciseKey: 'x', sets: [completed()], muscles: ['Full Body'] },
    ]);
    const touched = BODY_REGIONS.filter((r) => load[r] > 0);
    expect(touched.length).toBeGreaterThan(5);
    // And no single region takes it all.
    for (const r of touched) expect(load[r]).toBeLessThan(1);
  });

  test('a broad group credits the same total as a specific one', () => {
    const broad = computeRegionLoad([{ exerciseKey: 'x', sets: [completed()], muscles: ['Legs'] }]);
    const specific = computeRegionLoad([
      { exerciseKey: 'x', sets: [completed()], muscles: ['Quadriceps'] },
    ]);
    const total = (l: ReturnType<typeof emptyRegionLoad>) =>
      BODY_REGIONS.reduce((s, r) => s + l[r], 0);
    expect(total(broad)).toBeCloseTo(total(specific), 6);
  });

  test('no session produces a negative or non-finite load', () => {
    const load = computeRegionLoad([
      { exerciseKey: 'Bench Press', sets: [completed({ actualRpe: -3 }), completed({ actualRpe: 99 })] },
      { exerciseKey: 'Back Squats', sets: [completed({ actualReps: -5 })] },
    ]);
    for (const r of BODY_REGIONS) {
      expect(Number.isFinite(load[r])).toBe(true);
      expect(load[r]).toBeGreaterThanOrEqual(0);
    }
  });

  test('empty input yields an all-zero map with every region present', () => {
    const load = computeRegionLoad([]);
    expect(Object.keys(load).sort()).toEqual([...BODY_REGIONS].sort());
    for (const r of BODY_REGIONS) expect(load[r]).toBe(0);
  });

  test('sumRegionLoads adds region by region', () => {
    const a = computeRegionLoad([{ exerciseKey: 'Bench Press', sets: [completed()] }]);
    const b = computeRegionLoad([{ exerciseKey: 'Back Squats', sets: [completed()] }]);
    const total = sumRegionLoads([a, b]);
    for (const r of BODY_REGIONS) expect(total[r]).toBeCloseTo(a[r] + b[r], 6);
  });

  test('a real push session loads push regions and leaves legs alone', () => {
    const load = computeRegionLoad([
      { exerciseKey: 'Bench Press', sets: [completed(), completed(), completed()] },
      { exerciseKey: 'Incline Bench Press', sets: [completed(), completed(), completed()] },
      { exerciseKey: 'Tricep Pushdowns', sets: [completed(), completed(), completed()] },
    ]);
    expect(load.chest).toBeGreaterThan(2);
    expect(load.triceps).toBeGreaterThan(1);
    expect(load.quads).toBe(0);
    expect(load.hamstrings).toBe(0);
  });
});
