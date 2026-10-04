import type { ExercisePerformance, ExercisePerformanceInput, PerformedSet, WorkoutSet } from '@/types/workout';
import { resolveExercise } from '@/lib/exerciseLookup';

/**
 * Volume maths, in one place.
 *
 * Volume was previously computed as a bare `reps * weight` in seven separate
 * call sites. Introducing per-side exercises adds a multiplier, and duplicating
 * that decision seven times is how totals start disagreeing with each other, so
 * every caller now goes through here.
 *
 * ## Per-side exercises
 *
 * For roughly 29% of the exercise library the logged weight is not the total
 * load moved:
 *
 *  - **Dumbbell work** (Dumbbell Bench Press, Arnold Press): both sides work at
 *    once, but the number entered is the weight of *one* dumbbell.
 *  - **Truly unilateral work** (Bulgarian Split Squat, Single-Arm Row): one side
 *    at a time, with reps logged per side by convention.
 *
 * Both cases mean the session moved twice the entered load, so both use the
 * same ×2 multiplier — which is why one boolean covers them.
 *
 * ## Deliberately not retroactive
 *
 * `perSide` is undefined on every set logged before this existed, and undefined
 * means ×1. Historical sessions therefore keep exactly the totals they were
 * saved with. Reinterpreting them would double past volume overnight and make
 * the progress charts, PRs and achievement thresholds all lie about history.
 */

/** Load is moved by both limbs, so the entered weight counts twice. */
export const PER_SIDE_MULTIPLIER = 2;

export function volumeMultiplier(perSide: boolean | undefined): number {
  return perSide ? PER_SIDE_MULTIPLIER : 1;
}

/** Volume for a single performed set. Returns 0 for incomplete or skipped sets. */
export function performedSetVolume(set: PerformedSet, perSide?: boolean): number {
  if (!set.completed || set.skipped) return 0;
  const reps = set.actualReps || 0;
  const weight = set.actualWeight || 0;
  return reps * weight * volumeMultiplier(perSide);
}

/** Volume across a set list. */
export function performedSetsVolume(sets: PerformedSet[], perSide?: boolean): number {
  return sets.reduce((total, set) => total + performedSetVolume(set, perSide), 0);
}

/** Planned volume for a template set, from its targets. */
export function targetSetVolume(set: WorkoutSet, perSide?: boolean): number {
  const reps =
    typeof set.targetReps === 'number' ? set.targetReps : (set.targetReps?.min ?? 0);
  const weight = set.targetWeight || 0;
  return reps * weight * volumeMultiplier(perSide);
}

/**
 * Label for a weight field, so "50" is never ambiguous about whether it means
 * per dumbbell or in total.
 */
export function weightUnitLabel(useMetric: boolean, perSide?: boolean): string {
  const unit = useMetric ? 'kg' : 'lbs';
  return perSide ? `${unit}/side` : unit;
}

/* ── Server-side truth ────────────────────────────────────────────────────────
 * The write paths historically disagreed about the per-side multiplier (live
 * completions ×2, scheduled completions and retro-logs ×1), and several
 * trusted the client's pre-computed total. These helpers give every writer one
 * recomputation to go through, so a dumbbell set is worth the same volume no
 * matter which door it entered by.
 */

/** Anything that can answer "was this exercise logged per side?". */
export type TemplateExerciseShape = {
  id?: string;
  exerciseKey?: string;
  perSide?: boolean;
};

export type TemplateSnapshotShape = { exercises?: TemplateExerciseShape[] } | null | undefined;

/**
 * Resolution order for the per-side flag: the performance entry's own value,
 * then the template snapshot the session was logged under (matched by
 * exerciseId or exerciseKey), then — only when `fallbackToLibrary` is set —
 * the static library default.
 *
 * The library fallback is a safety net for *fresh* writes from clients that
 * did not send the flag. It must stay OFF when re-deriving volume for an
 * *edit* of an old session: rows logged before perSide existed were saved ×1
 * (see "Deliberately not retroactive" above), and inventing the flag now would
 * double their volume on a routine edit.
 */
export function resolvePerSide(
  ep: Pick<ExercisePerformance, 'exerciseKey' | 'perSide'>,
  exerciseId?: string,
  templateSnapshot?: TemplateSnapshotShape,
  opts: { fallbackToLibrary?: boolean } = {}
): boolean | undefined {
  if (typeof ep.perSide === 'boolean') return ep.perSide;
  const inTemplate = templateSnapshot?.exercises?.find(
    (t) =>
      (exerciseId !== undefined && t.id === exerciseId) ||
      (!!ep.exerciseKey && t.exerciseKey === ep.exerciseKey)
  );
  if (typeof inTemplate?.perSide === 'boolean') return inTemplate.perSide;
  if (opts.fallbackToLibrary) return resolveExercise(ep.exerciseKey)?.perSide;
  return undefined;
}

export interface RecomputedSessionTotals {
  /** New map with `perSide` resolved and `totalVolume` recomputed per exercise. */
  performance: { [exerciseId: string]: ExercisePerformance };
  totalVolume: number;
  completedSets: number;
  totalSets: number;
  totalExercises: number;
  skippedSets: number;
}

/**
 * Recompute every exercise's volume from its sets — client-supplied totals are
 * never trusted — and derive the session totals alongside, so all writers
 * agree on both the per-exercise numbers and the session rollup.
 *
 * Accepts the looser wire shape (totalVolume optional) because "the client
 * sent no total" is exactly the case this function exists to handle.
 */
export function recomputePerformanceVolume(
  performance: { [exerciseId: string]: ExercisePerformanceInput },
  templateSnapshot?: TemplateSnapshotShape,
  opts: { fallbackToLibrary?: boolean } = {}
): RecomputedSessionTotals {
  const recomputed: { [exerciseId: string]: ExercisePerformance } = {};
  let totalVolume = 0;
  let completedSets = 0;
  let totalSets = 0;
  let skippedSets = 0;

  for (const [exerciseId, ep] of Object.entries(performance)) {
    const perSide = resolvePerSide(ep, exerciseId, templateSnapshot, opts);
    const sets = Array.isArray(ep.sets) ? ep.sets : [];
    const volume = performedSetsVolume(sets, perSide);
    recomputed[exerciseId] = { ...ep, perSide, totalVolume: volume };
    totalVolume += volume;
    for (const set of sets) {
      totalSets += 1;
      // skipped+completed can coexist on rows edited through the history
      // modal; a skipped set is definitionally not a completed one.
      if (set.completed && !set.skipped) completedSets += 1;
      if (set.skipped) skippedSets += 1;
    }
  }

  return {
    performance: recomputed,
    totalVolume,
    completedSets,
    totalSets,
    totalExercises: Object.keys(recomputed).length,
    skippedSets,
  };
}
