import { exercises } from '@/lib/exercises';

/**
 * Ranked search over the static exercise library.
 *
 * Lifted out of JsonTemplateForm, where it was a local closure. The
 * log-past-workout page had its own search that did a plain `includes` on the
 * name and capped results at twenty, so the same query returned different
 * exercises depending on which screen you were standing on — and searching
 * "db press" or "leg quad" found nothing there while working fine in the
 * template builder. One implementation, one ranking, both callers.
 */

export type LibraryExercise = (typeof exercises)[keyof typeof exercises];
export type ExerciseEntry = [key: string, exercise: LibraryExercise];

/**
 * Scores one field against the search terms.
 *
 * Exact substring hits dominate; a term that only matches as a subsequence
 * ("dbpress" → "Dumbbell Press") scores at half weight and only once it covers
 * enough of the term to not be noise.
 */
function fuzzyScore(text: string, searchTerms: string[]): number {
  if (!text || searchTerms.length === 0) return 0;

  const textLower = text.toLowerCase();
  let score = 0;

  for (const term of searchTerms) {
    if (!term) continue;

    if (textLower.includes(term)) {
      score += 10;

      const wordBoundary = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      if (wordBoundary.test(text)) score += 5;
      if (textLower.startsWith(term)) score += 3;
    } else if (term.length >= 2) {
      let partial = 0;
      let lastIndex = -1;

      for (const char of term) {
        const charIndex = textLower.indexOf(char, lastIndex + 1);
        if (charIndex > lastIndex) {
          partial += 1;
          lastIndex = charIndex;
        }
      }

      const threshold = Math.max(2, Math.ceil(term.length * 0.6));
      if (partial >= threshold) score += partial * 0.5;
    }
  }

  return score;
}

/**
 * Every library exercise matching `query`, best match first.
 *
 * An empty query returns the whole library in declaration order — callers that
 * want a preview slice should take one themselves.
 */
export function searchExercises(query: string): ExerciseEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return Object.entries(exercises) as ExerciseEntry[];

  const terms = trimmed.toLowerCase().split(/\s+/);

  return (Object.entries(exercises) as ExerciseEntry[])
    .map(([key, exercise]) => {
      // Name is what people actually type; muscles are the common second guess;
      // equipment is a tiebreaker.
      const score =
        fuzzyScore(exercise.name, terms) * 3 +
        exercise.muscles.reduce((s, m) => s + fuzzyScore(m, terms), 0) * 2 +
        exercise.equipment.reduce((s, e) => s + fuzzyScore(e, terms), 0);

      return { key, exercise, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => [item.key, item.exercise] as ExerciseEntry);
}

/** The exercise library's own `exerciseType`, defaulted for older entries. */
export function getExerciseType(exerciseKey: string): 'strength' | 'cardio' | 'flexibility' {
  return exercises[exerciseKey as keyof typeof exercises]?.exerciseType ?? 'strength';
}
