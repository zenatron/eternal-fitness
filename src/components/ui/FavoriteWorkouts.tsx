import { motion } from 'framer-motion';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useToggleFavorite } from '@/lib/hooks/useMutations';
import { formatVolume } from '@/utils/formatters';
import { useProfile } from '@/lib/hooks/useProfile';
import { countUniqueExercises, getTotalSetsCount } from '@/utils/workoutDisplayUtils';

export default function FavoriteWorkouts() {
  const router = useRouter();
  const { profile } = useProfile();
  const { data: allTemplates, isLoading, error } = useTemplates();
  const toggleFavoriteMutation = useToggleFavorite();

  const templates = allTemplates?.filter((template) => template.favorite) ?? [];



  const handleToggleFavorite = (templateId: string) => {
    toggleFavoriteMutation.mutate(templateId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg">
        Error loading favorite workouts: {error.message}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <StarIconSolid className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          No favorite templates yet
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Mark templates as favorites to see them here for quick access
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template, index) => (
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

            {template.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                {template.description}
              </p>
            )}

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {countUniqueExercises(template)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Exercises</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {getTotalSetsCount(template)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sets</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {template.totalVolume && template.totalVolume > 0
                    ? formatVolume(template.totalVolume, profile?.useMetric)
                    : '-'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Volume</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push(`/template/${template.id}`)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                View Details
                <ArrowRightIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push(`/session/active/${template.id}`)}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Start Now
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
