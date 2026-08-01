'use client';

import type { WorkoutTemplate } from '@/types/workout';
import { formatVolume } from '@/utils/formatters';
import {
  countUniqueExercises,
  getTotalSetsCount,
  getDifficultyColor,
  getWorkoutTypeColor,
} from '@/utils/workoutDisplayUtils';

/**
 * How a template describes itself: name, difficulty and type badges, then the
 * exercise/set/volume line.
 *
 * Pulled out of TemplateCard so the log-past-workout picker can present
 * templates identically instead of the plain "N exercises · ~Xmin · strength"
 * text row it had, which shared no vocabulary with the cards on /templates.
 * Whatever the card gains — a new badge, a different stat — both surfaces get.
 */

interface TemplateSummaryProps {
  template: WorkoutTemplate;
  useMetric?: boolean;
  /** Slot for a star, a chevron, or nothing. Sits on the title row. */
  action?: React.ReactNode;
}

export function TemplateSummary({ template, useMetric = false, action }: TemplateSummaryProps) {
  const exercises = countUniqueExercises(template);
  const sets = getTotalSetsCount(template);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 font-display text-lg font-bold tracking-wide text-surface-50 dark:text-white">
          {template.name}
        </h3>
        {action}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getDifficultyColor(
            template.difficulty
          )}`}
        >
          {template.difficulty}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getWorkoutTypeColor(
            template.workoutType
          )}`}
        >
          {template.workoutType}
        </span>
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-surface-500 dark:text-surface-600">
        <span>
          <span className="font-display font-bold tabular text-surface-100 dark:text-surface-800">
            {exercises}
          </span>{' '}
          exercises
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <span className="font-display font-bold tabular text-surface-100 dark:text-surface-800">
            {sets}
          </span>{' '}
          sets
        </span>
        {template.totalVolume > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-accent-600 dark:text-accent-400 tabular">
              {formatVolume(template.totalVolume, useMetric)}
            </span>
          </>
        )}
      </p>
    </>
  );
}
