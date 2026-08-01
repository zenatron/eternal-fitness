'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  CalendarDaysIcon,
  PlayCircleIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import type { WorkoutTemplate } from '@/types/workout';
import { formatVolume } from '@/utils/formatters';
import {
  countUniqueExercises,
  getTotalSetsCount,
  getDifficultyColor,
  getWorkoutTypeColor,
} from '@/utils/workoutDisplayUtils';
import { springSnappy } from '@/lib/motion';

/**
 * The single template card used everywhere.
 *
 * There used to be three different ones — the favourites grid on /templates, the
 * "All templates" list below it, and the favourites section on /profile — each
 * with its own layout, its own action set and its own idea of where the star
 * goes. They looked like three unrelated apps.
 *
 * This is the favourites layout, which read best: title and star on the top row,
 * badges, stats, then a full-width primary action with the secondary actions
 * beneath. The star is always present and simply lit or unlit, so favouriting
 * works identically from any surface.
 */


interface TemplateCardProps {
  template: WorkoutTemplate;
  useMetric?: boolean;
  onToggleFavorite?: (templateId: string) => void;
  onSchedule?: (templateId: string, templateName: string) => void;
  onDelete?: (templateId: string, templateName: string) => void;
  /** Hides Schedule/Delete where those actions don't belong (e.g. /profile). */
  compact?: boolean;
  index?: number;
}

export function TemplateCard({
  template,
  useMetric = false,
  onToggleFavorite,
  onSchedule,
  onDelete,
  compact = false,
  index = 0,
}: TemplateCardProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const exercises = countUniqueExercises(template);
  const sets = getTotalSetsCount(template);

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 25,
        delay: prefersReducedMotion ? 0 : Math.min(index * 0.05, 0.3),
      }}
      className="forge-card heat-glow overflow-hidden"
    >
      <div className="h-1 bg-gradient-to-r from-accent-500 to-accent-700" />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 font-display text-lg font-bold tracking-wide text-surface-50 dark:text-white">
            {template.name}
          </h3>

          {onToggleFavorite && (
            <motion.button
              onClick={() => onToggleFavorite(template.id)}
              whileHover={prefersReducedMotion ? {} : { scale: 1.12 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
              transition={springSnappy}
              aria-pressed={template.favorite}
              aria-label={
                template.favorite
                  ? `Remove ${template.name} from favourites`
                  : `Add ${template.name} to favourites`
              }
              className={`touch-target flex shrink-0 items-center justify-center rounded-lg transition-colors tap-control ${
                template.favorite
                  ? 'bg-award-100 text-award-500 dark:bg-award-900/30 dark:text-award-400'
                  : 'bg-surface-900 text-surface-600 hover:text-award-500 dark:bg-surface-200 dark:text-surface-600'
              }`}
            >
              {template.favorite ? (
                <StarIconSolid className="h-5 w-5" />
              ) : (
                <StarIcon className="h-5 w-5" />
              )}
            </motion.button>
          )}
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

        <div className="mt-3.5 border-t border-surface-900 pt-3.5 dark:border-surface-300/50">
          <motion.button
            onClick={() => router.push(`/session/active/${template.id}`)}
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            transition={springSnappy}
            className="btn btn-primary flex min-h-[46px] w-full items-center justify-center gap-2 tap-control"
          >
            <PlayCircleIcon className="h-5 w-5 shrink-0" />
            Start Workout
          </motion.button>

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => router.push(`/template/${template.id}`)}
              className="btn btn-secondary min-h-[44px] flex-1 text-xs tap-control"
            >
              Details
            </button>

            {!compact && onSchedule && (
              <button
                onClick={() => onSchedule(template.id, template.name)}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-100 px-3 text-xs text-accent-700 transition-colors hover:bg-accent-200 dark:bg-accent-900/30 dark:text-accent-400 dark:hover:bg-accent-900/50 tap-control"
              >
                <CalendarDaysIcon className="h-4 w-4 shrink-0" />
                Schedule
              </button>
            )}

            {!compact && onDelete && (
              <button
                onClick={() => onDelete(template.id, template.name)}
                aria-label={`Delete ${template.name}`}
                className="touch-target flex shrink-0 items-center justify-center rounded-lg bg-danger-100 text-danger-600 transition-colors hover:bg-danger-200 dark:bg-danger-900/30 dark:text-danger-400 dark:hover:bg-danger-900/50 tap-control"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
