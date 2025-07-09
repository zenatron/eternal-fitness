'use client';

import { useRouter } from 'next/navigation';
import {
  StarIcon,
  PlusCircleIcon,
  ArrowRightIcon,
  QuestionMarkCircleIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

import { motion } from 'framer-motion';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useToggleFavorite } from '@/lib/hooks/useMutations';
import { useProfile } from '@/lib/hooks/useProfile';
import { formatVolume } from '@/utils/formatters';
import { WorkoutTemplate } from '@/types/workout';
import {
  countUniqueExercises,
  getTotalSetsCount,
  getDifficultyColor,
  getWorkoutTypeColor
} from '@/utils/workoutDisplayUtils';

export default function TemplatesPage() {
  const router = useRouter();
  const { data: templates, isLoading, error, refetch } = useTemplates();
  const toggleFavoriteMutation = useToggleFavorite();
  const { profile } = useProfile();

  // 🚀 Filter JSON-based templates
  const favoriteTemplates: WorkoutTemplate[] =
    templates?.filter((t: WorkoutTemplate) => t.favorite) || [];
  const unscheduledTemplates: WorkoutTemplate[] =
    templates?.filter((t: WorkoutTemplate) => !t.favorite) || [];

  const handleToggleFavorite = (templateId: string) => {
    console.log(`TemplatesPage: Toggling favorite for ${templateId}`);
    toggleFavoriteMutation.mutate(templateId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 px-8 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse"></div>
                    <div className="h-10 w-36 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mb-4"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                Error Loading Templates
              </h2>
              <p className="text-red-500 dark:text-red-300 mb-4">{String(error)}</p>
              <button
                onClick={() => refetch()}
                className="btn btn-danger"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 px-8 py-8 text-white">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Workout Templates 💪</h1>
                  <p className="text-blue-100">
                    Create, organize, and start your perfect workouts
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/session/start')}
                    className="btn btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 flex items-center gap-2"
                  >
                    <PlayCircleIcon className="w-5 h-5" />
                    Start Session
                  </button>
                  <button
                    onClick={() => router.push('/template/create')}
                    className="btn btn-primary bg-white text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <PlusCircleIcon className="w-5 h-5" />
                    Create Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Favorites Section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <StarIconSolid className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Favorite Templates
            </h2>
          </div>

          {favoriteTemplates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
              <StarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No favorite templates yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Mark templates as favorites to see them here for quick access
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                      <button
                        onClick={() => handleToggleFavorite(template.id)}
                        className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                      >
                        <StarIconSolid className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Exercises</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {countUniqueExercises(template)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Sets</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {getTotalSetsCount(template)}
                        </p>
                      </div>
                    </div>

                    {template.totalVolume > 0 && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mb-4">
                        <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Total Volume</p>
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                          {formatVolume(template.totalVolume, profile?.useMetric)}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                        {template.difficulty}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getWorkoutTypeColor(template.workoutType)}`}>
                        {template.workoutType}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/template/${template.id}`)}
                        className="flex-1 btn btn-secondary text-sm"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => router.push(`/session/active/${template.id}`)}
                        className="flex-1 btn btn-primary text-sm flex items-center justify-center gap-1"
                      >
                        <PlayCircleIcon className="w-4 h-4" />
                        Start
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* All Templates Section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <QuestionMarkCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              All Templates
            </h2>
          </div>

          {unscheduledTemplates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
              <PlusCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No templates created yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                Create your first workout template to get started
              </p>
              <button
                onClick={() => router.push('/template/create')}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Create Your First Template
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {unscheduledTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                          <QuestionMarkCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            {template.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400">
                                {countUniqueExercises(template)} exercises
                              </span>
                            </div>
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400">
                                {getTotalSetsCount(template)} sets
                              </span>
                            </div>
                            {template.totalVolume > 0 && (
                              <div className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-lg">
                                <span className="text-purple-600 dark:text-purple-400">
                                  {formatVolume(template.totalVolume, profile?.useMetric)}
                                </span>
                              </div>
                            )}
                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                              {template.difficulty}
                            </span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getWorkoutTypeColor(template.workoutType)}`}>
                              {template.workoutType}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleFavorite(template.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            template.favorite
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-amber-500'
                          }`}
                        >
                          {template.favorite ? (
                            <StarIconSolid className="w-5 h-5" />
                          ) : (
                            <StarIcon className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => router.push(`/template/${template.id}`)}
                          className="btn btn-secondary text-sm"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => router.push(`/session/active/${template.id}`)}
                          className="btn btn-primary text-sm flex items-center gap-1"
                        >
                          <PlayCircleIcon className="w-4 h-4" />
                          Start
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
