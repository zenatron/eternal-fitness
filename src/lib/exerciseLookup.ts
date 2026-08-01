import { exercises } from '@/lib/exercises';
import type { FormExercise } from '@/types/workout';

/**
 * Tolerant lookup into the exercise library.
 *
 * The library is keyed by display name ('Bench Press'), but exercise keys have
 * been written in at least two other shapes over the life of the app — slugs
 * ('bench-press') from the in-workout picker, and free-typed casing from
 * ad-hoc logging. A direct index therefore missed on anything not created by
 * the template builder, which silently made cardio exercises render as strength
 * (the `exerciseType` check just came back undefined).
 *
 * Resolution order: exact key, then normalised match.
 */

/** Lowercase, strip anything that isn't a letter or digit. */
function normalize(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Built once; the library is a static module-level object. */
let normalizedIndex: Map<string, FormExercise> | null = null;

function getIndex(): Map<string, FormExercise> {
  if (!normalizedIndex) {
    normalizedIndex = new Map();
    for (const [key, exercise] of Object.entries(exercises)) {
      normalizedIndex.set(normalize(key), exercise);
      // Index the display name too, in case it differs from the key.
      if (exercise.name) normalizedIndex.set(normalize(exercise.name), exercise);
    }
  }
  return normalizedIndex;
}

export function resolveExercise(key: string | undefined | null): FormExercise | undefined {
  if (!key) return undefined;
  const direct = exercises[key];
  if (direct) return direct;
  return getIndex().get(normalize(key));
}

/**
 * Whether an exercise is time/distance based rather than reps/weight, which
 * decides the entry fields shown for each set.
 */
export function isCardioExercise(key: string | undefined | null): boolean {
  return resolveExercise(key)?.exerciseType === 'cardio';
}

/** Display name, falling back to the raw key so the UI never renders blank. */
/**
 * Equipment that means "weight is loaded onto a bar", and therefore that a plate
 * breakdown is meaningful. Smith machines are included: the carriage is
 * counterbalanced differently per machine, but the plate maths is identical and
 * the "No bar" option covers the counterbalance.
 */
const BARBELL_EQUIPMENT = new Set([
  'Barbell',
  'Olympic Barbell',
  'EZ-Curl Bar',
  'Trap Bar',
  'Smith Machine',
]);

/**
 * Whether this exercise is loaded on a bar, so the plate calculator applies.
 *
 * Dumbbell and machine work is excluded deliberately — showing "2x20 per side"
 * for a dumbbell press would be actively wrong.
 */
export function isBarbellExercise(key: string | undefined | null): boolean {
  const exercise = resolveExercise(key);
  if (!exercise?.equipment) return false;
  return exercise.equipment.some((e) => BARBELL_EQUIPMENT.has(e));
}

/**
 * Best default bar for an exercise, so the calculator opens on the right one
 * rather than assuming a 20kg Olympic bar for a curl.
 */
export function defaultBarForExercise(key: string | undefined | null): string {
  const equipment = resolveExercise(key)?.equipment ?? [];
  if (equipment.includes('EZ-Curl Bar')) return 'ez';
  if (equipment.includes('Trap Bar')) return 'trap';
  if (equipment.includes('Smith Machine')) return 'none';
  return 'olympic';
}

export function exerciseDisplayName(key: string | undefined | null): string {
  if (!key) return 'Exercise';
  return resolveExercise(key)?.name ?? key;
}

/** The canonical library key for a possibly non-canonical one. */
export function canonicalExerciseKey(key: string): string {
  const resolved = resolveExercise(key);
  return resolved?.name ?? key;
}

export interface ExerciseSearchResult extends FormExercise {
  key: string;
}

/**
 * Ranked search over the whole library — replaces the hardcoded 12-item list
 * the in-workout picker used to offer.
 */
export function searchExercises(query: string, limit = 40): ExerciseSearchResult[] {
  const entries = Object.entries(exercises).map(([key, exercise]) => ({ key, ...exercise }));

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return entries.slice(0, limit);
  }

  const scored = entries
    .map((entry) => {
      const name = entry.name.toLowerCase();
      let score = -1;

      if (name === trimmed) score = 0;
      else if (name.startsWith(trimmed)) score = 1;
      else if (name.includes(trimmed)) score = 2;
      else if (entry.muscles.some((m) => m.toLowerCase().includes(trimmed))) score = 3;
      else if (entry.equipment.some((e) => e.toLowerCase().includes(trimmed))) score = 4;

      return { entry, score };
    })
    .filter((item) => item.score >= 0)
    // Exact and prefix matches first, then alphabetically within each tier.
    .sort((a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name));

  return scored.slice(0, limit).map((item) => item.entry);
}
