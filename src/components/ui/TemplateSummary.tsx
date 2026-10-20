'use client';

import type { WorkoutTemplate } from '@/types/workout';
import { countUniqueExercises, getTotalSetsCount } from '@/utils/workoutDisplayUtils';

/**
 * How a template describes itself: its name, what is in it, and how big it is.
 *
 * Shared by TemplateCard and the log-past-workout picker so both surfaces use
 * the same vocabulary. It used to lead with two coloured pill badges
 * (difficulty, type) — the least useful facts about a routine you wrote
 * yourself — and never said which exercises it contained.
 */

interface TemplateSummaryProps {
  template: WorkoutTemplate;
  useMetric?: boolean;
  /** Slot for a star, a chevron, or nothing. Sits on the title row. */
  action?: React.ReactNode;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function TemplateSummary({ template, action }: TemplateSummaryProps) {
  const exercises = countUniqueExercises(template);
  const sets = getTotalSetsCount(template);
  const names = (template.workoutData?.exercises ?? []).map((exercise) => exercise.name);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 truncate font-body text-base font-semibold text-surface-50 dark:text-white">
          {template.name}
        </h3>
        {action}
      </div>

      <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-600 tabular">
        <span className="capitalize">{template.workoutType}</span> · {plural(exercises, 'exercise')} ·{' '}
        {plural(sets, 'set')}
        {template.estimatedDuration > 0 && <> · ~{template.estimatedDuration} min</>}
      </p>

      {names.length > 0 && (
        <p className="mt-2 line-clamp-2 text-sm text-surface-300 dark:text-surface-800">{names.join(', ')}</p>
      )}
    </>
  );
}
