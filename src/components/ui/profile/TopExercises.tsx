import { BoltIcon, ScaleIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatVolume } from '@/utils/formatters';

interface TopExercisesProps {
  stats: UserStatsData;
  useMetric: boolean;
  onViewAll?: () => void;
}

export function TopExercises({ stats, useMetric, onViewAll }: TopExercisesProps) {

  const formatWeight = (weight: number) => {
    const unit = useMetric ? 'kg' : 'lbs';
    return `${weight.toFixed(1)} ${unit}`;
  };

  if (!stats.topExercises || stats.topExercises.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BoltIcon className="w-6 h-6 text-blue-500" />
          Top Exercises
        </h3>
        <div className="text-center py-8">
          <BoltIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No exercise data available yet. Complete some workouts to see your top exercises!
          </p>
        </div>
      </div>
    );
  }

  const maxVolume = Math.max(...stats.topExercises.map(ex => ex.totalVolume));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <BoltIcon className="w-6 h-6 text-blue-500" />
        Top Exercises
      </h3>
      <div className="space-y-4">
        {stats.topExercises.slice(0, 4).map((exercise, index) => {
          const volumePercentage = (exercise.totalVolume / maxVolume) * 100;
          
          return (
            <div
              key={exercise.exerciseKey}
              className="relative p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {/* Progress bar background */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 transition-all duration-500"
                  style={{ width: `${volumePercentage}%` }}
                />
              </div>
              
              {/* Content */}
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      #{index + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {exercise.name}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-4 h-4" />
                        <span>{exercise.sessionCount} sessions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ScaleIcon className="w-4 h-4" />
                        <span>Max: {formatWeight(exercise.maxWeight)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatVolume(exercise.totalVolume, useMetric)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Total Volume
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {stats.topExercises.length > 4 && (
        <div className="mt-4 text-center">
          <button
            onClick={onViewAll}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm inline-flex items-center gap-1 transition-colors"
          >
            View All Exercises ({stats.topExercises.length})
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
