import { describe, test, expect } from 'bun:test';
import {
  buildStrengthInsights,
  exerciseTrend,
  primaryRegion,
  weekRange,
  FLAT_THRESHOLD,
  type InsightSession,
  type StrengthPoint,
} from '@/utils/strengthInsights';
import { estimateOneRepMax } from '@/utils/oneRepMax';

const set = (weight: number, reps: number, extra: Record<string, unknown> = {}) => ({
  actualWeight: weight,
  actualReps: reps,
  completed: true,
  ...extra,
});

const session = (day: string, exercises: InsightSession['exercises']): InsightSession => ({ day, exercises });

const point = (day: string, e1rm: number): StrengthPoint => ({ day, e1rm, weight: e1rm, reps: 1 });

describe('primaryRegion', () => {
  test('credits an exercise to its first-listed muscle', () => {
    expect(primaryRegion('Bench Press')).toBe('chest');
    expect(primaryRegion('Barbell Curls')).toBe('biceps');
  });

  test('unknown exercises have no region', () => {
    expect(primaryRegion('Not A Real Lift')).toBeNull();
  });
});

describe('exerciseTrend', () => {
  test('needs three sessions before it calls a direction', () => {
    const t = exerciseTrend('Bench Press', [point('2026-01-01', 100), point('2026-01-08', 120)]);
    expect(t?.status).toBe('new');
    expect(t?.change).toBeNull();
    expect(t?.perWeek).toBeNull();
  });

  test('compares the best of the first two sessions with the best of the last two', () => {
    const t = exerciseTrend('Bench Press', [
      point('2026-01-01', 90), // a light first day…
      point('2026-01-08', 100), // …so the start is 100, not 90
      point('2026-01-15', 104),
      point('2026-01-22', 110),
    ])!;
    expect(t.start).toBe(100);
    expect(t.current).toBe(110);
    expect(t.change).toBeCloseTo(0.1);
    expect(t.status).toBe('up');
  });

  test('a move inside the noise band is flat, not progress', () => {
    const tiny = 100 * (1 + FLAT_THRESHOLD / 2);
    const t = exerciseTrend('Bench Press', [point('2026-01-01', 100), point('2026-01-08', 100), point('2026-01-15', tiny)])!;
    expect(t.status).toBe('flat');
  });

  test('reports a regression', () => {
    const t = exerciseTrend('Bench Press', [point('2026-01-01', 100), point('2026-01-08', 100), point('2026-01-15', 90), point('2026-01-22', 90)])!;
    expect(t.status).toBe('down');
  });

  test('slope is in units per week', () => {
    // +5 every 7 days.
    const t = exerciseTrend('Bench Press', [point('2026-01-01', 100), point('2026-01-08', 105), point('2026-01-15', 110)])!;
    expect(t.perWeek).toBeCloseTo(5);
  });

  test('records when the best was set', () => {
    const t = exerciseTrend('Bench Press', [point('2026-01-01', 100), point('2026-01-08', 120), point('2026-01-15', 110)])!;
    expect(t.best).toBe(120);
    expect(t.bestDay).toBe('2026-01-08');
  });

  test('sorts points whatever order they arrive in', () => {
    const t = exerciseTrend('Bench Press', [point('2026-01-15', 110), point('2026-01-01', 100), point('2026-01-08', 105)])!;
    expect(t.points.map((p) => p.day)).toEqual(['2026-01-01', '2026-01-08', '2026-01-15']);
  });
});

describe('weekRange', () => {
  test('covers every week start between two days', () => {
    // 2026-01-01 is a Thursday; weeks start on Sunday.
    expect(weekRange('2026-01-01', '2026-01-15')).toEqual(['2025-12-28', '2026-01-04', '2026-01-11']);
  });
});

describe('buildStrengthInsights', () => {
  const benchWeeks = [
    session('2026-01-05', [{ exerciseKey: 'Bench Press', sets: [set(100, 5), set(100, 5)] }]),
    session('2026-01-12', [{ exerciseKey: 'Bench Press', sets: [set(105, 5)] }]),
    session('2026-01-19', [{ exerciseKey: 'Bench Press', sets: [set(110, 5)] }]),
    session('2026-01-26', [{ exerciseKey: 'bench_press', sets: [set(115, 5)] }]),
  ];

  test('one trend per exercise, aliases merged', () => {
    const result = buildStrengthInsights(benchWeeks, { from: '2026-01-01', today: '2026-01-31' });
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].name).toBe('Bench Press');
    expect(result.exercises[0].sessions).toBe(4);
    expect(result.exercises[0].status).toBe('up');
  });

  test('uses the best set of each session', () => {
    const result = buildStrengthInsights(
      [session('2026-01-05', [{ exerciseKey: 'Bench Press', sets: [set(100, 5), set(120, 1)] }])],
      { from: '2026-01-01', today: '2026-01-10' }
    );
    expect(result.exercises[0].points[0].e1rm).toBe(Math.max(estimateOneRepMax(100, 5)!, 120));
  });

  test('ignores skipped and unfinished sets', () => {
    const result = buildStrengthInsights(
      [
        session('2026-01-05', [
          { exerciseKey: 'Bench Press', sets: [set(100, 5), set(300, 5, { skipped: true }), set(300, 5, { completed: false })] },
        ]),
      ],
      { from: '2026-01-01', today: '2026-01-10' }
    );
    expect(result.exercises[0].best).toBeCloseTo(estimateOneRepMax(100, 5)!);
  });

  test('a muscle trained by one lift reports exactly that lift\'s change', () => {
    const result = buildStrengthInsights(benchWeeks, { from: '2026-01-01', today: '2026-01-31' });
    const chest = result.regions.find((r) => r.region === 'chest')!;
    const bench = result.exercises[0];
    expect(chest.change).toBeCloseTo(bench.change!);
    expect(chest.exercises).toEqual(['Bench Press']);
    // The index is relative to the bench's (two-session) starting level.
    const defined = chest.index.filter((w) => w.value !== null);
    expect(defined[defined.length - 1].value).toBeCloseTo(bench.current / bench.start);
  });

  test('carries an index forward through a week off', () => {
    const result = buildStrengthInsights(
      [
        session('2026-01-05', [{ exerciseKey: 'Bench Press', sets: [set(100, 5)] }]),
        session('2026-01-07', [{ exerciseKey: 'Bench Press', sets: [set(100, 5)] }]),
        // no bench the week of the 11th
        session('2026-01-19', [{ exerciseKey: 'Bench Press', sets: [set(110, 5)] }]),
      ],
      { from: '2026-01-04', today: '2026-01-24' }
    );
    const chest = result.regions.find((r) => r.region === 'chest')!;
    // Week of the 11th repeats the week before it.
    expect(chest.index[1].value).toBeCloseTo(chest.index[0].value!);
    expect(chest.index[2].value).toBeCloseTo(1.1);
  });

  test('weekly sets count work in the regions an exercise loads', () => {
    const result = buildStrengthInsights(benchWeeks, { from: '2026-01-01', today: '2026-01-31' });
    const chest = result.regions.find((r) => r.region === 'chest')!;
    const firstBenchWeek = chest.weeklySets.find((w) => w.week === '2026-01-04')!;
    expect(firstBenchWeek.value).toBeGreaterThan(0);
    // Triceps are loaded by the bench but no triceps exercise was trained, so
    // they have volume and no strength index.
    const triceps = result.regions.find((r) => r.region === 'triceps')!;
    expect(triceps.exercises).toEqual([]);
    expect(triceps.index.every((w) => w.value === null)).toBe(true);
  });

  test('flags a lift that is still trained but has not set a best in three weeks', () => {
    const result = buildStrengthInsights(
      [
        session('2026-01-05', [{ exerciseKey: 'Bench Press', sets: [set(100, 5)] }]),
        session('2026-01-12', [{ exerciseKey: 'Bench Press', sets: [set(110, 5)] }]),
        session('2026-01-26', [{ exerciseKey: 'Bench Press', sets: [set(105, 5)] }]),
        session('2026-02-02', [{ exerciseKey: 'Bench Press', sets: [set(105, 5)] }]),
      ],
      { from: '2026-01-01', today: '2026-02-03' }
    );
    expect(result.exercises[0].daysSinceBest).toBe(22);
    expect(result.exercises[0].stalled).toBe(true);
  });

  test('a lift that was simply dropped is not "stalled"', () => {
    const result = buildStrengthInsights(benchWeeks, { from: '2026-01-01', today: '2026-03-31' });
    expect(result.exercises[0].stalled).toBe(false);
  });

  test('an empty window yields no trends', () => {
    const result = buildStrengthInsights([], { from: '2026-01-01', today: '2026-01-31' });
    expect(result.exercises).toEqual([]);
    expect(result.regions).toEqual([]);
    expect(result.weeks.length).toBeGreaterThan(0);
  });
});
