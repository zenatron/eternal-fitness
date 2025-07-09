import { ChartBarIcon } from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';

interface MonthlyProgressProps {
  stats: UserStatsData;
  useMetric: boolean;
}

export function MonthlyProgress({ stats, useMetric }: MonthlyProgressProps) {
  const formatVolume = (volume: number) => {
    const unit = useMetric ? 'kg' : 'lbs';
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M ${unit}`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K ${unit}`;
    }
    return `${volume.toFixed(0)} ${unit}`;
  };

  if (!stats.monthlyStats || stats.monthlyStats.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <ChartBarIcon className="w-6 h-6 text-green-500" />
          Monthly Progress
        </h3>
        <div className="text-center py-8">
          <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No monthly data available yet. Complete some workouts to see your progress!
          </p>
        </div>
      </div>
    );
  }

  // Get last 6 months of data
  const recentMonths = stats.monthlyStats.slice(0, 6).reverse();
  const maxWorkouts = Math.max(...recentMonths.map(m => m.workoutsCount));
  const maxVolume = Math.max(...recentMonths.map(m => m.volume));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <ChartBarIcon className="w-6 h-6 text-green-500" />
        Monthly Progress
      </h3>
      
      <div className="space-y-6">
        {/* Workouts Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            Workouts Completed
          </h4>
          <div className="space-y-2">
            {recentMonths.map((month, index) => {
              const percentage = maxWorkouts > 0 ? (month.workoutsCount / maxWorkouts) * 100 : 0;
              
              return (
                <div key={`${month.year}-${month.month}`} className="flex items-center gap-3">
                  <div className="w-16 text-sm text-gray-600 dark:text-gray-400">
                    {month.month} {month.year}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${percentage}%` }}
                      >
                        {month.workoutsCount > 0 && (
                          <span className="text-white text-sm font-medium">
                            {month.workoutsCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Volume Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            Total Volume
          </h4>
          <div className="space-y-2">
            {recentMonths.map((month, index) => {
              const percentage = maxVolume > 0 ? (month.volume / maxVolume) * 100 : 0;
              
              return (
                <div key={`${month.year}-${month.month}-volume`} className="flex items-center gap-3">
                  <div className="w-16 text-sm text-gray-600 dark:text-gray-400">
                    {month.month} {month.year}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-400 to-purple-500 transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${percentage}%` }}
                      >
                        {month.volume > 0 && (
                          <span className="text-white text-sm font-medium">
                            {formatVolume(month.volume)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Training Hours Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            Training Hours
          </h4>
          <div className="space-y-2">
            {recentMonths.map((month, index) => {
              const maxHours = Math.max(...recentMonths.map(m => m.trainingHours));
              const percentage = maxHours > 0 ? (month.trainingHours / maxHours) * 100 : 0;
              
              return (
                <div key={`${month.year}-${month.month}-hours`} className="flex items-center gap-3">
                  <div className="w-16 text-sm text-gray-600 dark:text-gray-400">
                    {month.month} {month.year}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${percentage}%` }}
                      >
                        {month.trainingHours > 0 && (
                          <span className="text-white text-sm font-medium">
                            {month.trainingHours.toFixed(1)}h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
