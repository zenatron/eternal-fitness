'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  StarIcon as StarOutline,
  ClockIcon,
  PlayCircleIcon,
  BoltIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ReadinessNote } from '@/components/recovery/ReadinessNote';
import type { PlannedExercise } from '@/utils/trainingSuggestions';

import { useTemplate } from '@/lib/hooks/useTemplate';
import { useProfile } from '@/lib/hooks/useProfile';
import { useToggleFavorite, useDeleteTemplate } from '@/lib/hooks/useMutations';
import { formatVolume } from '@/utils/formatters';
import { formatInstantDate } from '@/utils/relativeTime';
import { WorkoutExercise, WorkoutSet } from '@/types/workout';
import {
  getTemplateExercises,
  formatSetDisplay,
  getDifficultyColor,
  getWorkoutTypeColor,
  getTotalSetsCount
} from '@/utils/workoutDisplayUtils';
import { springSnappy, springGentle } from '@/lib/motion';


// 🚀 JSON-BASED EXERCISE DISPLAY COMPONENT
interface ExerciseDisplayProps {
  exercise: WorkoutExercise;
  profile: any;
}

/**
 * One exercise in the template breakdown.
 *
 * Rebuilt mobile-first. The previous version used a pink gradient header, a
 * purple placeholder square where an icon should be, emoji labels for muscles
 * and equipment, and a four-column table that could not fit a phone — the
 * "10 × 35lbs" target wrapped onto two lines in a 90px column.
 *
 * Sets are now a simple stacked list on mobile and only become a table where
 * there is room for one.
 */
function ExerciseDisplay({ exercise, profile }: ExerciseDisplayProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="forge-card overflow-hidden"
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
    >
      <div className="h-1 bg-gradient-to-r from-accent-500 to-accent-700" />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-900/30">
            <BoltIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-lg font-bold tracking-wide text-surface-50 dark:text-white">
              {exercise.name}
            </h4>

            <dl className="mt-2 space-y-1 text-sm">
              {exercise.muscles?.length ? (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-surface-500 dark:text-surface-600">Muscles</dt>
                  <dd className="min-w-0 text-surface-100 dark:text-surface-800">
                    {exercise.muscles.join(', ')}
                  </dd>
                </div>
              ) : null}
              {exercise.equipment?.length ? (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-surface-500 dark:text-surface-600">Equipment</dt>
                  <dd className="min-w-0 text-surface-100 dark:text-surface-800">
                    {exercise.equipment.join(', ')}
                  </dd>
                </div>
              ) : null}
              {exercise.restBetweenSets ? (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-surface-500 dark:text-surface-600">Rest</dt>
                  <dd className="text-surface-100 dark:text-surface-800 tabular">
                    {exercise.restBetweenSets}s between sets
                  </dd>
                </div>
              ) : null}
            </dl>

            {exercise.instructions && (
              <p className="mt-3 rounded-lg bg-surface-950 p-3 text-sm text-surface-600 dark:bg-surface-200/40 dark:text-surface-800">
                {exercise.instructions}
              </p>
            )}
          </div>
        </div>

        <ul className="mt-4 space-y-1.5 border-t border-surface-900 pt-3 dark:border-surface-300/50">
          {exercise.sets.map((set, index) => (
            <li
              key={set.id}
              className="flex items-center gap-3 rounded-lg bg-surface-950 px-3 py-2 dark:bg-surface-200/40"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-100 font-display text-xs font-bold tabular text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
                {index + 1}
              </span>

              <span className="min-w-0 flex-1 font-display text-sm font-bold tabular text-surface-50 dark:text-white">
                {formatSetDisplay(set, profile?.useMetric)}
              </span>

              {set.type && set.type !== 'standard' && (
                <span className="shrink-0 rounded-full bg-surface-900 px-2 py-0.5 text-[10px] uppercase tracking-wider text-surface-600 dark:bg-surface-300 dark:text-surface-800">
                  {set.type}
                </span>
              )}

              {set.restTime ? (
                <span className="shrink-0 text-xs tabular text-surface-500 dark:text-surface-600">
                  {set.restTime}s
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export default function TemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  const router = useRouter();

  const {
    template,
    isLoading: templateLoading,
    error: templateError,
  } = useTemplate(templateId);
  const { profile, isLoading: profileLoading } = useProfile();
  const toggleFavoriteMutation = useToggleFavorite();
  const deleteTemplateMutation = useDeleteTemplate();
  const prefersReducedMotion = useReducedMotion();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 🚀 Get JSON-based exercises
  const exercises = template ? getTemplateExercises(template) : [];


  const handleToggleFavorite = () => {
    if (!template) return;
    toggleFavoriteMutation.mutate(templateId);
  };

  const handleDeleteTemplate = () => setShowDeleteConfirm(true);

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    if (!template) return;
    try {
      await deleteTemplateMutation.mutateAsync(templateId);
      toast.success('Template deleted successfully!');
      router.push('/'); // Redirect after delete
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template.');
    }
  };

  const isLoading = templateLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="w-full h-full py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (templateError || !template) {
    return (
      <div className="w-full h-full py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-500/30 text-danger-700 dark:text-danger-400 rounded-lg">
            {templateError ? String(templateError) : 'Template not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={springGentle}
      className="w-full py-8 px-4 app-bg"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header.
            Was a blue-to-purple gradient with the title, four icon buttons and
            six stat tiles competing for one row — at phone width the title
            wrapped to three lines and the star button fell off the edge. Title
            and actions are now stacked, and the stats compressed to a single
            scannable row. */}
        <div className="mb-6">
          <div className="forge-card overflow-hidden">
            <div className="greeting-gradient px-5 py-5 text-white sm:px-6">
              <div className="flex items-start gap-3">
                <motion.button
                  onClick={() => router.back()}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                  transition={springSnappy}
                  className="touch-target flex shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20 tap-control"
                  aria-label="Go back"
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </motion.button>

                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">
                    {template.name}
                  </h1>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-accent-100">
                    <ClockIcon className="h-4 w-4 shrink-0" />
                    Created{' '}
                    {formatInstantDate(template.createdAt, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <motion.button
                  onClick={handleToggleFavorite}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                  transition={springSnappy}
                  className="touch-target flex shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20 tap-control"
                  aria-pressed={template.favorite}
                  aria-label={template.favorite ? 'Remove from favourites' : 'Add to favourites'}
                >
                  {template.favorite ? (
                    <StarSolid className="h-6 w-6 text-award-300" />
                  ) : (
                    <StarOutline className="h-6 w-6 text-white" />
                  )}
                </motion.button>
              </div>

              {/* Stats: one compact row rather than six tiles. */}
              <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Exercises', value: exercises.length },
                  { label: 'Sets', value: getTotalSetsCount(template) },
                  {
                    label: 'Volume',
                    value: formatVolume(template.totalVolume, profile?.useMetric),
                  },
                  { label: 'Est.', value: `${template.estimatedDuration}m` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg bg-white/10 px-2 py-2 text-center backdrop-blur-sm"
                  >
                    <dd className="font-display text-base font-bold tabular">{stat.value}</dd>
                    <dt className="mt-0.5 text-[10px] uppercase tracking-wider text-accent-100">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>

              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium capitalize">
                  {template.difficulty}
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium capitalize">
                  {template.workoutType}
                </span>
              </div>

              <ReadinessNote exercises={(exercises ?? []) as unknown as PlannedExercise[]} />

              <div className="mt-4 flex items-center gap-2">
                <motion.button
                  onClick={() => router.push(`/session/active/${templateId}`)}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  transition={springSnappy}
                  className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-white font-display font-bold uppercase tracking-wide text-accent-700 shadow-sm transition-colors hover:bg-accent-50 tap-control"
                >
                  <PlayCircleIcon className="h-5 w-5 shrink-0" />
                  Start Workout
                </motion.button>
                <motion.button
                  onClick={() => router.push(`/template/edit/${templateId}`)}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  transition={springSnappy}
                  className="touch-target flex shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20 tap-control"
                  aria-label="Edit template"
                >
                  <PencilIcon className="h-5 w-5 text-white" />
                </motion.button>
                <motion.button
                  onClick={handleDeleteTemplate}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  transition={springSnappy}
                  className="touch-target flex shrink-0 items-center justify-center rounded-xl bg-danger-500/25 transition-colors hover:bg-danger-500/40 tap-control"
                  aria-label="Delete template"
                >
                  <TrashIcon className="h-5 w-5 text-white" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Exercises Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-900/30">
              <ClipboardDocumentListIcon className="h-6 w-6 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold tracking-wide text-surface-50 dark:text-white">
                Workout Exercises
              </h2>
              <p className="text-surface-500 dark:text-surface-600">
                {exercises.length} exercise{exercises.length === 1 ? '' : 's'} configured for this template
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {exercises.length > 0 ? (
              exercises.map((exercise, index) => (
                <motion.div
                  key={exercise.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ ...springGentle, delay: prefersReducedMotion ? 0 : index * 0.1 }}
                >
                  <ExerciseDisplay
                    exercise={exercise}
                    profile={profile}
                  />
                </motion.div>
              ))
            ) : (
              <div className="forge-card p-12 text-center">
                <div className="p-4 bg-surface-900 dark:bg-surface-200 rounded-full w-20 h-20 mx-auto mb-6">
                  <div className="w-12 h-12 bg-surface-400 rounded mx-auto"></div>
                </div>
                <h3 className="text-xl font-display font-bold tracking-wide text-surface-50 dark:text-white mb-2">
                  No Exercises Found
                </h3>
                <p className="text-surface-500 dark:text-surface-600 mb-4">
                  This template currently has no exercises configured.
                </p>
                <motion.button
                  onClick={() => router.push(`/template/edit/${templateId}`)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springSnappy}
                  className="btn btn-primary min-h-[46px] tap-control"
                >
                  Add Exercises
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* Action Section */}
        <div className="text-center">
          <motion.button
            onClick={() => router.push(`/session/active/${templateId}`)}
            className="btn btn-primary mx-auto flex min-h-[52px] w-full max-w-sm items-center justify-center gap-3 text-base tap-control"
            whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.96 }}
            transition={springSnappy}
          >
            <PlayCircleIcon className="w-7 h-7" />
            Start Workout Session
          </motion.button>
          <p className="text-surface-500 dark:text-surface-600 mt-3 text-sm">
            Begin a new workout session using this template
          </p>
        </div>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this template?"
        message={`"${template.name}" will be removed permanently. Workouts you've already logged from it are kept.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </motion.div>
  );
}
