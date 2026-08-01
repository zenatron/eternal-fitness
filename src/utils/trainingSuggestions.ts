import { BODY_REGIONS, REGION_META, type BodyRegion } from '@/lib/muscleRegions';
import { computeRegionLoad, type LoadedExercise, type LoadSet, type RegionLoad } from '@/utils/muscleLoad';
import type { RecoveryMap } from '@/utils/recovery';

/**
 * Matching a planned workout against current recovery.
 *
 * The recovery map says which muscles are tired; this says what to do about it.
 * A template is scored by how much of the work it prescribes lands on muscles
 * that are ready — so a leg day the morning after squats scores badly, while an
 * upper session on the same day scores well.
 *
 * Load-weighted rather than a plain average across the regions touched:
 * incidental involvement should not drag a score down. A push session brushes
 * the core, and a fatigued core is not a reason to skip it.
 */

/** Shape of a template exercise, kept minimal so callers need not import the full type. */
export interface PlannedExercise {
  exerciseKey: string;
  /** Cached on templates; falls back to the exercise library when absent. */
  muscles?: string[];
  sets: PlannedSet[];
}

export interface PlannedSet {
  targetReps?: number | { min: number; max: number };
  targetWeight?: number;
  targetDuration?: number;
  targetRpe?: number;
}

export type ReadinessStatus = 'ideal' | 'good' | 'caution' | 'avoid';

export interface RegionShare {
  region: BodyRegion;
  label: string;
  /** Fraction of the template's total load landing here, 0-1. */
  share: number;
  freshness: number;
}

export interface TemplateReadiness {
  /** Load-weighted average freshness of the muscles this template trains, 0-1. */
  score: number;
  status: ReadinessStatus;
  /** Heaviest-loaded regions, most first. What this workout is *for*. */
  primary: RegionShare[];
  /** Regions carrying real load that are not recovered. Why to think twice. */
  conflicts: RegionShare[];
  /** True when the template prescribes nothing recognisable. */
  empty: boolean;
}

/**
 * A planned set is treated as one that will be completed as prescribed. That is
 * the only reasonable assumption before the fact, and it keeps this consistent
 * with how the same session will be scored once logged.
 */
function plannedToLoadSet(set: PlannedSet): LoadSet {
  const reps = typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.min;
  return {
    completed: true,
    actualReps: reps,
    actualWeight: set.targetWeight,
    actualDuration: set.targetDuration,
    actualRpe: set.targetRpe,
  };
}

export function plannedRegionLoad(exercises: readonly PlannedExercise[]): RegionLoad {
  const loaded: LoadedExercise[] = exercises.map((exercise) => ({
    exerciseKey: exercise.exerciseKey,
    // An empty cached array should fall through to the library rather than
    // being treated as "this exercise works no muscles".
    muscles: exercise.muscles?.length ? exercise.muscles : undefined,
    sets: (exercise.sets ?? []).map(plannedToLoadSet),
  }));
  return computeRegionLoad(loaded);
}

export function readinessStatus(score: number): ReadinessStatus {
  if (score >= 0.8) return 'ideal';
  if (score >= 0.6) return 'good';
  if (score >= 0.4) return 'caution';
  return 'avoid';
}

export const READINESS_LABELS: Record<ReadinessStatus, string> = {
  ideal: 'Ready',
  good: 'Good to go',
  caution: 'Partly fatigued',
  avoid: 'Needs rest',
};

/**
 * A region must carry at least this share of the workout to count as one of its
 * targets. Below it the involvement is incidental, and flagging it would mean
 * warning about triceps before a leg day.
 */
const MEANINGFUL_SHARE = 0.12;

/** Freshness below which a meaningfully-loaded region is called a conflict. */
const CONFLICT_FRESHNESS = 0.5;

export function scoreTemplate(
  exercises: readonly PlannedExercise[],
  recovery: RecoveryMap
): TemplateReadiness {
  const load = plannedRegionLoad(exercises);
  const total = BODY_REGIONS.reduce((sum, r) => sum + load[r], 0);

  if (total <= 0) {
    return { score: 1, status: 'ideal', primary: [], conflicts: [], empty: true };
  }

  const shares: RegionShare[] = BODY_REGIONS.filter((r) => load[r] > 0)
    .map((region) => ({
      region,
      label: REGION_META[region].label,
      share: load[region] / total,
      freshness: recovery[region]?.freshness ?? 1,
    }))
    .sort((a, b) => b.share - a.share);

  const score = shares.reduce((sum, s) => sum + s.share * s.freshness, 0);

  return {
    score,
    status: readinessStatus(score),
    primary: shares.filter((s) => s.share >= MEANINGFUL_SHARE),
    conflicts: shares.filter(
      (s) => s.share >= MEANINGFUL_SHARE && s.freshness < CONFLICT_FRESHNESS
    ),
    empty: false,
  };
}

export interface ScoredTemplate<T> {
  template: T;
  readiness: TemplateReadiness;
}

/**
 * Ranks templates best-first.
 *
 * Templates that prescribe nothing recognisable sort last despite scoring 1 —
 * a workout the model cannot read is not a recommendation, and floating it to
 * the top would be actively misleading.
 */
export function rankTemplates<T>(
  templates: readonly T[],
  getExercises: (template: T) => readonly PlannedExercise[],
  recovery: RecoveryMap
): ScoredTemplate<T>[] {
  return templates
    .map((template) => ({ template, readiness: scoreTemplate(getExercises(template), recovery) }))
    .sort((a, b) => {
      if (a.readiness.empty !== b.readiness.empty) return a.readiness.empty ? 1 : -1;
      return b.readiness.score - a.readiness.score;
    });
}

/** "Chest", "Chest and Triceps", "Chest, Triceps and Shoulders". */
export function formatRegionList(labels: readonly string[]): string {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
