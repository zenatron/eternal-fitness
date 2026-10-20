'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  PencilIcon,
  TrashIcon,
  StarIcon as StarOutline,
  PlayCircleIcon,
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
import { WorkoutExercise } from '@/types/workout';
import {
  getTemplateExercises,
  formatSetDisplay,
  getTotalSetsCount
} from '@/utils/workoutDisplayUtils';
import { springGentle } from '@/lib/motion';

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
  return (
    <li className="px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="truncate font-body text-sm font-semibold text-surface-50 dark:text-white">{exercise.name}</h3>
        {exercise.restBetweenSets ? (
          <span className="shrink-0 text-xs text-surface-500 dark:text-surface-600 tabular">
            rest {exercise.restBetweenSets}s
          </span>
        ) : null}
      </div>
      {exercise.muscles?.length ? (
        <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-600">{exercise.muscles.join(', ')}</p>
      ) : null}
      {exercise.instructions && (
        <p className="mt-2 text-sm text-surface-300 dark:text-surface-800">{exercise.instructions}</p>
      )}
      {/* One line per set; per-side work says so, since "55" alone does not
          say whether it is each dumbbell or the pair. */}
      <ol className="mt-2 flex flex-wrap gap-1.5">
        {exercise.sets.map((set, index) => (
          <li
            key={set.id}
            className="rounded-md bg-black/[0.04] px-2 py-1 text-xs text-surface-100 dark:bg-white/[0.05] dark:text-surface-900 tabular"
            title={`Set ${index + 1}${set.type && set.type !== 'standard' ? ` (${set.type})` : ''}`}
          >
            {formatSetDisplay(set, profile?.useMetric)}
            {exercise.perSide && set.targetWeight ? '/side' : ''}
            {set.type && set.type !== 'standard' && (
              <span className="ml-1 text-surface-500">{set.type}</span>
            )}
          </li>
        ))}
      </ol>
    </li>
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
      toast.success('Template deleted');
      router.push('/templates');
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
        <PageHeader
          back
          title={template.name}
          description={
            <span className="capitalize">
              {template.workoutType} · {template.difficulty} · created{' '}
              {formatInstantDate(template.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          }
          actions={
            <>
              <button
                onClick={() => router.push(`/session/active/${templateId}`)}
                className="btn btn-primary tap-control min-h-[44px] flex-1 px-6 sm:flex-none"
              >
                <PlayCircleIcon className="h-5 w-5" />
                Start
              </button>
              <button
                onClick={handleToggleFavorite}
                className="btn btn-tertiary touch-target tap-control !px-0"
                aria-pressed={template.favorite}
                aria-label={template.favorite ? 'Remove from favorites' : 'Add to favorites'}
                title={template.favorite ? 'Unfavorite' : 'Favorite'}
              >
                {template.favorite ? <StarSolid className="h-5 w-5 text-award-500" /> : <StarOutline className="h-5 w-5" />}
              </button>
              <button
                onClick={() => router.push(`/template/edit/${templateId}`)}
                className="btn btn-tertiary touch-target tap-control !px-0"
                aria-label="Edit template"
                title="Edit"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleDeleteTemplate}
                className="btn btn-tertiary touch-target tap-control !px-0 hover:!text-danger-500"
                aria-label="Delete template"
                title="Delete"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </>
          }
        />

        <dl className="forge-card mb-4 grid grid-cols-4 gap-px overflow-hidden bg-black/[0.06] dark:bg-white/[0.06]">
          {[
            { label: 'Exercises', value: exercises.length },
            { label: 'Sets', value: getTotalSetsCount(template) },
            { label: 'Volume', value: template.totalVolume > 0 ? formatVolume(template.totalVolume, profile?.useMetric) : '—' },
            { label: 'Time', value: `~${template.estimatedDuration}m` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white px-3 py-3 dark:bg-surface-100">
              <dt className="stat-label">{stat.label}</dt>
              <dd className="mt-1 font-display text-base font-semibold text-surface-50 dark:text-white tabular">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mb-6">
          <ReadinessNote exercises={(exercises ?? []) as unknown as PlannedExercise[]} />
        </div>

        <section>
          <h2 className="section-title mb-2">Exercises</h2>
          {exercises.length > 0 ? (
            <ul className="forge-card divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {exercises.map((exercise) => (
                <ExerciseDisplay key={exercise.id} exercise={exercise} profile={profile} />
              ))}
            </ul>
          ) : (
            <div className="forge-card px-6 py-10 text-center">
              <p className="font-medium text-surface-50 dark:text-white">No exercises yet</p>
              <button
                onClick={() => router.push(`/template/edit/${templateId}`)}
                className="btn btn-primary tap-control mt-4"
              >
                Add exercises
              </button>
            </div>
          )}
        </section>
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
