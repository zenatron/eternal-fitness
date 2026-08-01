import type { PerformedSet, WorkoutSet } from '@/types/workout';

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
