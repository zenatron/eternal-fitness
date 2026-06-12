import { motion } from 'framer-motion';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useToggleFavorite } from '@/lib/hooks/useMutations';
import { formatVolume } from '@/utils/formatters';
import { useProfile } from '@/lib/hooks/useProfile';
import { countUniqueExercises, getTotalSetsCount } from '@/utils/workoutDisplayUtils';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

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
      <div className="forge-card p-8 text-center">
        <StarIconSolid className="w-16 h-16 text-surface-600 mx-auto mb-4" />
        <p className="text-surface-500 dark:text-surface-600 mb-2">
          No favorite templates yet
        </p>
        <p className="text-sm text-surface-600 dark:text-surface-500">
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
          transition={{ ...springSnappy, delay: index * 0.1 }}
          whileHover={{ scale: 1.03, y: -4 }}
          className="forge-card overflow-hidden"
        >
          <div className="h-2 bg-gradient-to-r from-forge-400 to-ember-500"></div>
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-display font-bold text-surface-800 dark:text-white">
                {template.name}
              </h3>
              <motion.button
                onClick={() => handleToggleFavorite(template.id)}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                transition={springSnappy}
                className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              >
                <StarIconSolid className="w-5 h-5" />
              </motion.button>
            </div>

            {template.description && (
              <p className="text-surface-500 dark:text-surface-600 text-sm mb-4 line-clamp-2">
                {template.description}
              </p>
            )}

            <div className="grid grid-cols-3 gap-4 mb-4">
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springBouncy, delay: index * 0.1 + 0.2 }}
              >
                <p className="text-2xl font-display font-bold tracking-wide text-forge-600 dark:text-forge-400">
                  {countUniqueExercises(template)}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-600">Exercises</p>
              </motion.div>
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springBouncy, delay: index * 0.1 + 0.3 }}
              >
                <p className="text-2xl font-display font-bold tracking-wide text-green-600 dark:text-green-400">
                  {getTotalSetsCount(template)}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-600">Sets</p>
              </motion.div>
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springBouncy, delay: index * 0.1 + 0.4 }}
              >
                <p className="text-2xl font-display font-bold tracking-wide text-forge-600 dark:text-forge-400">
                  {template.totalVolume && template.totalVolume > 0
                    ? formatVolume(template.totalVolume, profile?.useMetric)
                    : '-'}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-600">Volume</p>
              </motion.div>
            </div>

            <div className="flex items-center justify-between">
              <motion.button
                onClick={() => router.push(`/template/${template.id}`)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={springSnappy}
                className="btn btn-primary text-sm flex items-center gap-2"
              >
                View Details
                <ArrowRightIcon className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={() => router.push(`/session/active/${template.id}`)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={springSnappy}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
              >
                Start Now
              </motion.button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
