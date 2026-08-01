import { BODY_REGIONS, regionsForMuscle, type BodyRegion } from '@/lib/muscleRegions';
import { resolveExercise } from '@/lib/exerciseLookup';

/**
 * Training load per body region.
 *
 * Load is measured in **effective sets**, not in volume. Volume looks like the
 * obvious unit and is the wrong one here: it makes a 200kg squat set read as
 * twenty times more fatiguing than a 10kg curl set, when the recovery cost is
 * nowhere near that ratio, and it collapses to zero for bodyweight and cardio
 * work — which would leave pull-ups and running invisible on a recovery map.
 *
 * An effective set is one completed working set, scaled by how hard it was and
 * by how much of it a given muscle actually did.
 */

export interface LoadSet {
  completed?: boolean;
  skipped?: boolean;
  actualRpe?: number;
  actualReps?: number;
  actualWeight?: number;
  actualDuration?: number;
}

export type RegionLoad = Record<BodyRegion, number>;

export function emptyRegionLoad(): RegionLoad {
  return Object.fromEntries(BODY_REGIONS.map((r) => [r, 0])) as RegionLoad;
}

/**
 * How much each muscle in an exercise's list is worked, by position.
 *
 * The library lists the prime mover first and assistors after, so position is
 * already a usable signal and needs no new data entry. The fall-off is
 * deliberately gentle — a bench press does genuinely tax the triceps, just not
 * as much as the chest.
 *
 * Beyond the fourth muscle everything is incidental; 0.1 keeps it on the map
 * without letting a long list dominate.
 */
const POSITION_WEIGHTS = [1, 0.5, 0.3, 0.2] as const;
const TRAILING_WEIGHT = 0.1;

export function positionWeight(index: number): number {
  return POSITION_WEIGHTS[index] ?? TRAILING_WEIGHT;
}

/**
 * RPE 8 — a hard set with a couple of reps left — is the reference point and
 * scores 1.0. Below that the set still counts for something; above it costs
 * more. Clamped so a mis-entered RPE cannot dominate the map.
 */
const REFERENCE_RPE = 8;
const MIN_RPE_SCALE = 0.5;
const MAX_RPE_SCALE = 1.25;

export function rpeScale(rpe: number | undefined): number {
  if (typeof rpe !== 'number' || !Number.isFinite(rpe) || rpe <= 0) return 1;
  return Math.min(MAX_RPE_SCALE, Math.max(MIN_RPE_SCALE, rpe / REFERENCE_RPE));
}

/** Effective-set value of one logged set. Skipped and unfinished sets are worth nothing. */
export function setStimulus(set: LoadSet): number {
  if (!set.completed || set.skipped) return 0;

  // A set with no work recorded at all is a placeholder, not a set.
  const didSomething =
    (set.actualReps ?? 0) > 0 || (set.actualDuration ?? 0) > 0 || (set.actualWeight ?? 0) > 0;
  if (!didSomething) return 0;

  return rpeScale(set.actualRpe);
}

export interface LoadedExercise {
  exerciseKey: string;
  sets: LoadSet[];
  /** Overrides the library lookup. Mainly for exercises not in the library. */
  muscles?: string[];
}

/**
 * Per-region load for a group of exercises.
 *
 * Note that the totals across regions can exceed the number of sets performed:
 * one bench press set loads chest *and* triceps *and* front delts. That is
 * intentional — this measures stimulus received per muscle, not an accounting
 * of sets, and each region is later compared against its own capacity.
 */
export function computeRegionLoad(exercises: readonly LoadedExercise[]): RegionLoad {
  const load = emptyRegionLoad();

  for (const exercise of exercises) {
    const stimulus = (exercise.sets ?? []).reduce((sum, set) => sum + setStimulus(set), 0);
    if (stimulus <= 0) continue;

    const muscles = exercise.muscles ?? resolveExercise(exercise.exerciseKey)?.muscles ?? [];
    if (muscles.length === 0) continue;

    muscles.forEach((muscle, index) => {
      const share = positionWeight(index);
      for (const [region, weight] of Object.entries(regionsForMuscle(muscle))) {
        load[region as BodyRegion] += stimulus * share * (weight ?? 0);
      }
    });
  }

  return load;
}

/** Sums several region loads, e.g. across the sessions of a week. */
export function sumRegionLoads(loads: readonly RegionLoad[]): RegionLoad {
  const total = emptyRegionLoad();
  for (const load of loads) {
    for (const region of BODY_REGIONS) total[region] += load[region] ?? 0;
  }
  return total;
}
