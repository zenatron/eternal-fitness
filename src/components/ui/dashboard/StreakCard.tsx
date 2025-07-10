import { FireIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { ActivityDay } from '@/types/dashboard';
import { motion } from 'framer-motion';

interface StreakCardProps {
  streak: number;
  activityData: ActivityDay[];
}

export function StreakCard({ streak, activityData }: StreakCardProps) {
  const completedDays = activityData.filter(day => day.completed).length;
  const totalDays = activityData.length;
  const completionRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
    >
      <div className="h-2 bg-gradient-to-r from-orange-500 to-red-500"></div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Current Streak</h2>
          <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20">
            <FireIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        {/* Streak Display */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className="text-6xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              {streak}
            </div>
            <div className="absolute -top-2 -right-2">
              <FireIcon className="w-8 h-8 text-orange-500 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
            {streak === 1 ? 'day streak' : 'days streak'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Keep it up! 🔥
          </p>
        </div>

        {/* Activity Calendar */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4" />
              Last 4 Weeks
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {completionRate.toFixed(0)}% completion
            </p>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {activityData.slice(-28).map((day, index) => (
              <div
                key={index}
                className={`h-7 w-full rounded-lg transition-all duration-200 ${
                  day.completed
                    ? 'bg-gradient-to-br from-green-400 to-green-500 shadow-sm'
                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
                title={`${day.date}: ${day.completed ? 'Workout completed ✅' : 'Rest day'}`}
              />
            ))}
          </div>

          <div className="flex justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>4 weeks ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Motivation Message */}
        <div className="mt-4 text-center">
          {streak >= 7 ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Amazing consistency! 🌟
            </p>
          ) : streak >= 3 ? (
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              Great momentum! 💪
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Start your streak today! 🚀
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
