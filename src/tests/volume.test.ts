import { describe, test, expect } from 'bun:test';
import {
  performedSetVolume,
  recomputePerformanceVolume,
  resolvePerSide,
  type TemplateSnapshotShape,
} from '@/lib/volume';
import type { ExercisePerformance, PerformedSet } from '@/types/workout';

/**
 * Guards the per-side volume contract: the entered weight for dumbbell and
 * unilateral work counts twice, the multiplier resolves consistently across
 * every write path, and the server recomputation never trusts a client total.
 * The historical bug: the same dumbbell workout logged 2× volume when completed
 * live and 1× when completed from a schedule or retro-log, and a session edit
 * recomputed bare reps×weight — silently deflating lifetime stats by half.
 */

const set = (overrides: Partial<PerformedSet> = {}): PerformedSet => ({
  setId: 's1',
  completed: true,
  ...overrides,
});

const perf = (sets: PerformedSet[], overrides: Partial<ExercisePerformance> = {}): ExercisePerformance => ({
  exerciseKey: 'Dumbbell Bench Press',
  sets,
  totalVolume: 0,
  ...overrides,
});

const snapshotWith = (
  id: string,
  exerciseKey: string,
  perSide?: boolean
): TemplateSnapshotShape => ({
  exercises: [{ id, exerciseKey, perSide }],
});

describe('performedSetVolume', () => {
  test('counts a plain barbell set once', () => {
    expect(performedSetVolume(set({ actualReps: 10, actualWeight: 135 }))).toBe(1350);
  });

  test('doubles per-side work', () => {
    expect(performedSetVolume(set({ actualReps: 10, actualWeight: 40 }), true)).toBe(800);
  });

  test('scores incomplete and skipped sets as zero regardless of perSide', () => {
    expect(performedSetVolume(set({ completed: false, actualReps: 10, actualWeight: 40 }), true)).toBe(0);
    expect(performedSetVolume(set({ skipped: true, actualReps: 10, actualWeight: 40 }), true)).toBe(0);
  });

  test('treats missing reps or weight as zero, not NaN', () => {
    expect(performedSetVolume(set({}))).toBe(0);
    expect(performedSetVolume(set({ actualReps: 5 }))).toBe(0);
  });
});

describe('resolvePerSide', () => {
  test('prefers the explicit flag on the performance entry', () => {
    const ep = { exerciseKey: 'Bench Press', perSide: false };
    expect(resolvePerSide(ep, 'ex-1', snapshotWith('ex-1', 'Bench Press', true))).toBe(false);
  });

  test('falls back to the template snapshot matched by id or key', () => {
    expect(resolvePerSide({ exerciseKey: 'other' }, 'ex-1', snapshotWith('ex-1', 'Bench Press', true))).toBe(true);
    expect(
      resolvePerSide({ exerciseKey: 'Dumbbell Bench Press' }, 'ex-9', snapshotWith('ex-1', 'Dumbbell Bench Press', true))
    ).toBe(true);
  });

  test('without a match, library fallback applies only when requested', () => {
    expect(resolvePerSide({ exerciseKey: 'Dumbbell Bench Press' }, 'x', undefined)).toBeUndefined();
    expect(resolvePerSide({ exerciseKey: 'Dumbbell Bench Press' }, 'x', undefined, { fallbackToLibrary: true })).toBe(true);
    // The library default must not leak into legacy-row re-derivations.
    expect(resolvePerSide({ exerciseKey: 'Dumbbell Bench Press' }, 'x', snapshotWith('x', 'Bench Press', undefined))).toBeUndefined();
  });
});

describe('recomputePerformanceVolume', () => {
  test('recomputes volume from sets, ignoring the client total', () => {
    const result = recomputePerformanceVolume({
      'ex-1': perf([set({ actualReps: 10, actualWeight: 40 })], { totalVolume: 999999 }),
    });
    // No flag, no snapshot: ×1 (the legacy rule) — but crucially NOT the
    // client's 999999.
    expect(result.performance['ex-1'].totalVolume).toBe(400);
    expect(result.totalVolume).toBe(400);
  });

  test('resolves the per-side multiplier from the template snapshot', () => {
    const result = recomputePerformanceVolume(
      { 'ex-1': perf([set({ actualReps: 10, actualWeight: 40 })]) },
      snapshotWith('ex-1', 'Dumbbell Bench Press', true)
    );
    expect(result.totalVolume).toBe(800);
    expect(result.performance['ex-1'].perSide).toBe(true);
  });

  test('rolls up session totals, distinguishing completed from skipped', () => {
    const result = recomputePerformanceVolume({
      'ex-1': perf([
        set({ actualReps: 10, actualWeight: 135 }),
        set({ setId: 's2', completed: false }),
        set({ setId: 's3', completed: true, skipped: true, actualReps: 8, actualWeight: 100 }),
      ]),
      'ex-2': perf([set({ setId: 's1', actualReps: 3, actualWeight: 20 })]),
    });
    expect(result.totalVolume).toBe(1410);
    expect(result.completedSets).toBe(2);
    expect(result.totalSets).toBe(4);
    expect(result.skippedSets).toBe(1);
    expect(result.totalExercises).toBe(2);
  });

  test('is robust against malformed entries (missing sets array)', () => {
    const result = recomputePerformanceVolume({
      'ex-1': { exerciseKey: 'x' } as unknown as ExercisePerformance,
    });
    expect(result.totalVolume).toBe(0);
    expect(result.totalSets).toBe(0);
    expect(result.totalExercises).toBe(1);
  });

  test('an edit of a pre-perSide row without snapshot or flag keeps ×1', () => {
    // This is the "Deliberately not retroactive" rule: re-deriving volume for
    // an edit must not double historical sessions.
    const result = recomputePerformanceVolume({
      'ex-1': perf([set({ actualReps: 10, actualWeight: 40 })]),
    });
    expect(result.totalVolume).toBe(400);
  });
});
