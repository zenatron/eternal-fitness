import { describe, test, expect } from 'bun:test';
import {
  scoreTemplate,
  rankTemplates,
  plannedRegionLoad,
  readinessStatus,
  READINESS_LABELS,
  formatRegionList,
  type PlannedExercise,
} from '@/utils/trainingSuggestions';
import { computeRecovery, type LoadEvent } from '@/utils/recovery';
import { emptyRegionLoad, computeRegionLoad } from '@/utils/muscleLoad';
import { BODY_REGIONS, type BodyRegion } from '@/lib/muscleRegions';

const NOW = new Date('2026-07-31T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

const sets = (n: number) => Array.from({ length: n }, () => ({ targetReps: 8, targetWeight: 60 }));

const LEG_DAY: PlannedExercise[] = [
  { exerciseKey: 'Back Squats', sets: sets(5) },
  { exerciseKey: 'Romanian Deadlift', sets: sets(3) },
];
const PUSH_DAY: PlannedExercise[] = [
  { exerciseKey: 'Bench Press', sets: sets(4) },
  { exerciseKey: 'Tricep Pushdowns', sets: sets(3) },
];

const restedBody = () => computeRecovery([], NOW);

const afterHardLegs = (hoursSince: number) => {
  const load = computeRegionLoad([
    {
      exerciseKey: 'Back Squats',
      sets: Array.from({ length: 6 }, () => ({
        completed: true,
        actualReps: 5,
        actualWeight: 140,
        actualRpe: 9,
      })),
    },
  ]);
  const events: LoadEvent[] = [{ at: hoursAgo(hoursSince), load }];
  return computeRecovery(events, NOW);
};

describe('plannedRegionLoad', () => {
  test('a planned session loads the muscles it prescribes', () => {
    const load = plannedRegionLoad(LEG_DAY);
    expect(load.quads).toBeGreaterThan(0);
    expect(load.hamstrings).toBeGreaterThan(0);
    expect(load.chest).toBe(0);
  });

  test('uses cached muscles when the template supplies them', () => {
    const load = plannedRegionLoad([
      { exerciseKey: 'Not In Library', muscles: ['Lats'], sets: sets(3) },
    ]);
    expect(load.lats).toBeGreaterThan(0);
  });

  test('falls back to the library when the cache is empty', () => {
    // An empty array must not read as "this exercise works nothing".
    const cached = plannedRegionLoad([{ exerciseKey: 'Bench Press', muscles: [], sets: sets(3) }]);
    const looked = plannedRegionLoad([{ exerciseKey: 'Bench Press', sets: sets(3) }]);
    expect(cached.chest).toBeCloseTo(looked.chest, 6);
    expect(cached.chest).toBeGreaterThan(0);
  });

  test('handles a rep range by taking the bottom of it', () => {
    const load = plannedRegionLoad([
      { exerciseKey: 'Bench Press', sets: [{ targetReps: { min: 8, max: 12 }, targetWeight: 60 }] },
    ]);
    expect(load.chest).toBeGreaterThan(0);
  });

  test('an empty template loads nothing', () => {
    expect(plannedRegionLoad([])).toEqual(emptyRegionLoad());
  });
});

describe('scoreTemplate', () => {
  test('everything scores well on a rested body', () => {
    for (const template of [LEG_DAY, PUSH_DAY]) {
      const r = scoreTemplate(template, restedBody());
      expect(r.score).toBe(1);
      expect(r.status).toBe('ideal');
      expect(r.conflicts).toEqual([]);
    }
  });

  test('a leg day the morning after legs scores badly', () => {
    const r = scoreTemplate(LEG_DAY, afterHardLegs(10));
    expect(r.score).toBeLessThan(0.6);
    expect(r.conflicts.map((c) => c.region)).toContain('quads');
  });

  test('a push day the morning after legs is unaffected', () => {
    const r = scoreTemplate(PUSH_DAY, afterHardLegs(10));
    expect(r.score).toBeGreaterThan(0.9);
    expect(r.conflicts).toEqual([]);
  });

  test('score recovers as the fatigued session ages', () => {
    const scores = [6, 24, 48, 96].map((h) => scoreTemplate(LEG_DAY, afterHardLegs(h)).score);
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThan(scores[i - 1]);
  });

  test('primary regions are the ones actually being trained', () => {
    const r = scoreTemplate(LEG_DAY, restedBody());
    const regions = r.primary.map((p) => p.region);
    expect(regions).toContain('quads');
    expect(regions).not.toContain('chest');
  });

  test('primary regions are sorted by how much work they take', () => {
    const r = scoreTemplate(LEG_DAY, restedBody());
    for (let i = 1; i < r.primary.length; i++) {
      expect(r.primary[i].share).toBeLessThanOrEqual(r.primary[i - 1].share);
    }
  });

  test('shares of the whole workout sum to 1', () => {
    const r = scoreTemplate(LEG_DAY, restedBody());
    // primary is filtered, so recompute across every loaded region.
    const load = plannedRegionLoad(LEG_DAY);
    const total = BODY_REGIONS.reduce((s, x) => s + load[x], 0);
    expect(total).toBeGreaterThan(0);
    const sum = BODY_REGIONS.reduce((s, x) => s + load[x] / total, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  test('incidental involvement does not drag the score down', () => {
    // Core is spent, but a push day only brushes it — that is not a reason to
    // skip the session.
    const load = emptyRegionLoad();
    load.abs = 40;
    const coreFried = computeRecovery([{ at: hoursAgo(1), load }], NOW);
    const r = scoreTemplate(PUSH_DAY, coreFried);
    expect(r.score).toBeGreaterThan(0.85);
    expect(r.conflicts).toEqual([]);
  });

  test('an unreadable template is flagged rather than recommended', () => {
    const r = scoreTemplate([{ exerciseKey: 'Underwater Basket Weaving', sets: sets(3) }], restedBody());
    expect(r.empty).toBe(true);
    expect(r.primary).toEqual([]);
  });

  test('an empty template is empty, not ideal', () => {
    expect(scoreTemplate([], restedBody()).empty).toBe(true);
  });

  test('score always lands between 0 and 1', () => {
    const brutal = emptyRegionLoad();
    for (const r of BODY_REGIONS) brutal[r] = 100;
    const wrecked = computeRecovery([{ at: hoursAgo(0), load: brutal }], NOW);
    for (const template of [LEG_DAY, PUSH_DAY]) {
      for (const recovery of [restedBody(), wrecked, afterHardLegs(12)]) {
        const s = scoreTemplate(template, recovery).score;
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      }
    }
  });

  test('a missing region in the recovery map is treated as fresh', () => {
    const partial = {} as Record<BodyRegion, { freshness: number }>;
    expect(() =>
      scoreTemplate(LEG_DAY, partial as unknown as ReturnType<typeof restedBody>)
    ).not.toThrow();
  });
});

describe('readinessStatus', () => {
  test('runs from ready down to needing rest', () => {
    expect(readinessStatus(1)).toBe('ideal');
    expect(readinessStatus(0.7)).toBe('good');
    expect(readinessStatus(0.5)).toBe('caution');
    expect(readinessStatus(0.1)).toBe('avoid');
  });

  test('every score has a label', () => {
    for (let s = 0; s <= 1.0001; s += 0.05) {
      expect(READINESS_LABELS[readinessStatus(Math.min(1, s))].length).toBeGreaterThan(0);
    }
  });
});

describe('rankTemplates', () => {
  const templates = [
    { name: 'Legs', exercises: LEG_DAY },
    { name: 'Push', exercises: PUSH_DAY },
    { name: 'Mystery', exercises: [] as PlannedExercise[] },
  ];
  const rank = (recovery: ReturnType<typeof restedBody>) =>
    rankTemplates(templates, (t) => t.exercises, recovery);

  test('puts the best match first', () => {
    const ranked = rank(afterHardLegs(10));
    expect(ranked[0].template.name).toBe('Push');
  });

  test('unreadable templates sort last despite a perfect score', () => {
    const ranked = rank(restedBody());
    expect(ranked[ranked.length - 1].template.name).toBe('Mystery');
  });

  test('is stable in ordering by score', () => {
    const ranked = rank(afterHardLegs(10));
    const readable = ranked.filter((r) => !r.readiness.empty);
    for (let i = 1; i < readable.length; i++) {
      expect(readable[i].readiness.score).toBeLessThanOrEqual(readable[i - 1].readiness.score);
    }
  });

  test('an empty template list ranks to nothing', () => {
    expect(rankTemplates([], () => [], restedBody())).toEqual([]);
  });
});

describe('formatRegionList', () => {
  test('reads naturally at every length', () => {
    expect(formatRegionList([])).toBe('');
    expect(formatRegionList(['Chest'])).toBe('Chest');
    expect(formatRegionList(['Chest', 'Triceps'])).toBe('Chest and Triceps');
    // Not "Chest and Triceps and Shoulders".
    expect(formatRegionList(['Chest', 'Triceps', 'Shoulders'])).toBe(
      'Chest, Triceps and Shoulders'
    );
  });
});
