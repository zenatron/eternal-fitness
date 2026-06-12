'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  StarIcon as StarOutline,
  ClockIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';

import { useTemplate } from '@/lib/hooks/useTemplate';
import { useProfile } from '@/lib/hooks/useProfile';
import { useToggleFavorite, useDeleteTemplate } from '@/lib/hooks/useMutations';
import { formatVolume } from '@/utils/formatters';
import { formatUTCDateToLocalDateFriendly } from '@/utils/dateUtils';
import { WorkoutExercise, WorkoutSet } from '@/types/workout';
import {
  getTemplateExercises,
  formatSetDisplay,
  getDifficultyColor,
  getWorkoutTypeColor,
  getTotalSetsCount
} from '@/utils/workoutDisplayUtils';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

// 🚀 JSON-BASED EXERCISE DISPLAY COMPONENT
interface ExerciseDisplayProps {
  exercise: WorkoutExercise;
  profile: any;
}

function ExerciseDisplay({ exercise, profile }: ExerciseDisplayProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="forge-card overflow-hidden"
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
    >
      <div className="h-1 bg-gradient-to-r from-forge-500 to-pink-500"></div>
      <div className="bg-gradient-to-br from-forge-50 to-pink-50 dark:from-forge-900/20 dark:to-pink-900/20 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-forge-100 dark:bg-forge-900/30 rounded-xl">
            <div className="w-6 h-6 bg-purple-600 dark:bg-purple-400 rounded"></div>
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white mb-3">
              {exercise.name}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-forge-600 dark:text-forge-400">💪 Muscles:</span>
                <span className="text-surface-600 dark:text-surface-800">
                  {exercise.muscles?.join(', ') || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-forge-600 dark:text-forge-400">🏋️ Equipment:</span>
                <span className="text-surface-600 dark:text-surface-800">
                  {exercise.equipment?.join(', ') || 'N/A'}
                </span>
              </div>
              {exercise.restBetweenSets && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-forge-600 dark:text-forge-400">⏱️ Rest:</span>
                  <span className="text-surface-600 dark:text-surface-800">
                    {exercise.restBetweenSets}s between sets
                  </span>
                </div>
              )}
            </div>
            {exercise.instructions && (
              <div className="mt-3 p-3 bg-white/50 dark:bg-surface-100/50 rounded-lg">
                <span className="font-semibold text-forge-600 dark:text-forge-400 text-sm">📝 Instructions:</span>
                <p className="text-sm text-surface-600 dark:text-surface-800 mt-1">
                  {exercise.instructions}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <h5 className="text-lg font-display font-bold text-surface-800 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-forge-600 dark:text-forge-400">📊</span>
          Sets Configuration
        </h5>

        <div className="bg-surface-950 dark:bg-surface-200/50 rounded-xl overflow-hidden">
          <div className="grid grid-cols-4 gap-4 p-4 bg-surface-100 dark:bg-surface-200 text-sm font-semibold text-surface-500 dark:text-surface-600">
            <div>Set</div>
            <div>Type</div>
            <div>Target</div>
            <div>Rest</div>
          </div>

          <div className="divide-y divide-surface-200 dark:divide-surface-400">
            {exercise.sets.map((set, index) => (
              <div
                key={set.id}
                className="grid grid-cols-4 gap-4 p-4 hover:bg-surface-950 dark:hover:bg-surface-200/30 transition-colors"
              >
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-forge-100 dark:bg-forge-900/30 rounded-lg text-sm font-bold text-forge-600 dark:text-forge-400">
                    {index + 1}
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    set.type === 'warmup' ? 'bg-forge-100 text-forge-800 dark:bg-forge-900/30 dark:text-blue-300' :
                    set.type === 'working' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    'bg-surface-100 text-surface-800 dark:bg-surface-200 dark:text-surface-800'
                  }`}>
                    {set.type}
                  </span>
                </div>
                <div className="flex items-center text-surface-600 dark:text-surface-800 font-medium">
                  {formatSetDisplay(set, profile?.useMetric)}
                </div>
                <div className="flex items-center text-surface-600 dark:text-surface-800">
                  {set.restTime ? (
                    <span className="px-2 py-1 bg-surface-100 dark:bg-surface-600 rounded-md text-xs">
                      {set.restTime}s
                    </span>
                  ) : (
                    <span className="text-surface-600">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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

  // 🚀 Get JSON-based exercises
  const exercises = template ? getTemplateExercises(template) : [];


  const handleToggleFavorite = () => {
    if (!template) return;
    toggleFavoriteMutation.mutate(templateId);
  };

  const handleDeleteTemplate = async () => {
    if (!template) return;
    if (
      !confirm(
        `Are you sure you want to delete the template "${template.name}"? This cannot be undone.`,
      )
    )
      return;
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
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (templateError || !template) {
    return (
      <div className="w-full h-full py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">
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
      className="w-full min-h-screen py-8 px-4 app-bg"
    >
      <div className="max-w-6xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="forge-card overflow-hidden">
            <div className="greeting-gradient bg-gradient-to-br from-forge-600 via-blue-600 to-purple-800 px-8 py-8 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={() => router.back()}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={springSnappy}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Go back"
                  >
                    <ArrowLeftIcon className="h-6 w-6" />
                  </motion.button>
                  <div>
                    <h1 className="text-3xl font-display font-bold tracking-wide mb-2">
                      {template.name}
                    </h1>
                    <div className="flex items-center gap-2 text-forge-100">
                      <ClockIcon className="h-5 w-5" />
                      <span>
                        Created {formatUTCDateToLocalDateFriendly(template.createdAt, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  {/* Start Workout Button */}
                  <motion.button
                    onClick={() => router.push(`/session/active/${templateId}`)}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-xl transition-colors flex items-center gap-2 font-semibold"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={springSnappy}
                    aria-label="Start workout session"
                  >
                    <PlayCircleIcon className="w-5 h-5" />
                    Start Workout
                  </motion.button>

                  <motion.button
                    onClick={handleToggleFavorite}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={springSnappy}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label={template.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {template.favorite ? (
                      <StarSolid className="h-6 w-6 text-amber-400" />
                    ) : (
                      <StarOutline className="h-6 w-6 text-white" />
                    )}
                  </motion.button>
                  <motion.button
                    onClick={() => router.push(`/template/edit/${templateId}`)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={springSnappy}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Edit template"
                  >
                    <PencilIcon className="h-6 w-6 text-white" />
                  </motion.button>
                  <motion.button
                    onClick={handleDeleteTemplate}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={springSnappy}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Delete template"
                  >
                    <TrashIcon className="h-6 w-6 text-white" />
                  </motion.button>
                </div>
              </div>

              {/* Enhanced Stats Section */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -2 }}
                  transition={springSnappy}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
                >
                  <div className="text-2xl font-display font-bold tracking-wide">{exercises.length}</div>
                  <div className="text-sm text-forge-100">Exercises</div>
                </motion.div>
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -2 }}
                  transition={springSnappy}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
                >
                  <div className="text-2xl font-display font-bold tracking-wide">{getTotalSetsCount(template)}</div>
                  <div className="text-sm text-forge-100">Total Sets</div>
                </motion.div>
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -2 }}
                  transition={springSnappy}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
                >
                  <div className="text-2xl font-display font-bold tracking-wide">{formatVolume(template.totalVolume, profile?.useMetric)}</div>
                  <div className="text-sm text-forge-100">Volume</div>
                </motion.div>
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -2 }}
                  transition={springSnappy}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
                >
                  <div className="text-2xl font-display font-bold tracking-wide">~{template.estimatedDuration}</div>
                  <div className="text-sm text-forge-100">Minutes</div>
                </motion.div>
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -2 }}
                  transition={springSnappy}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
                >
                  <div className="text-lg font-display font-bold capitalize">{template.difficulty}</div>
                  <div className="text-sm text-forge-100">Difficulty</div>
                </motion.div>
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -2 }}
                  transition={springSnappy}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
                >
                  <div className="text-lg font-display font-bold capitalize">{template.workoutType}</div>
                  <div className="text-sm text-forge-100">Type</div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Exercises Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-forge-100 dark:bg-forge-900/30 rounded-xl">
              <div className="w-6 h-6 bg-purple-600 dark:bg-purple-400 rounded"></div>
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white">
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
                <div className="p-4 bg-surface-100 dark:bg-surface-200 rounded-full w-20 h-20 mx-auto mb-6">
                  <div className="w-12 h-12 bg-surface-400 rounded mx-auto"></div>
                </div>
                <h3 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white mb-2">
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
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
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
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors flex items-center gap-3 mx-auto font-semibold text-lg shadow-lg hover:shadow-xl"
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
    </motion.div>
  );
}
