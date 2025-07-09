import {
  ChartBarIcon,
  ArrowUpIcon,
  TrophyIcon,
  CalendarDaysIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import { ProgressData } from '@/types/dashboard';
import { motion } from 'framer-motion';

interface ProgressCardProps {
  data: ProgressData;
}

export function ProgressCard({ data }: ProgressCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
    >
      <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Progress</h2>
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
            <ChartBarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Progress Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center mb-2">
              <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {data.workoutsCompleted}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              sessions completed
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-800/20 rounded-xl p-4 text-center border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-center mb-2">
              <TrophyIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {data.personalRecords}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
              personal records
            </p>
          </div>
        </div>

        {/* Weight Progress */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ScaleIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Weight Progress
              </p>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUpIcon className="h-4 w-4 text-green-500" />
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {data.weightProgress.current}{data.weightProgress.unit}
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${data.weightProgress.percentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">Start</span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                {data.weightProgress.percentage}% complete
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Goal: {data.weightProgress.goal}{data.weightProgress.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="mt-4 text-center">
          {data.personalRecords > 0 ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              🎉 You're crushing your goals!
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Keep pushing - your first PR is coming! 💪
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
