'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatVolume } from '@/utils/formatters';

interface MonthlyProgressProps {
  stats: UserStatsData;
  useMetric: boolean;
}

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

export function MonthlyProgress({ stats, useMetric }: MonthlyProgressProps) {
  const prefersReducedMotion = useReducedMotion();
  const noMotion = prefersReducedMotion ?? false;

  if (!stats.monthlyStats || stats.monthlyStats.length === 0) {
    return (
      <motion.div
        initial={noMotion ? {} : { opacity: 0, y: 20 }}
        animate={noMotion ? {} : { opacity: 1, y: 0 }}
        transition={springGentle}
        className="forge-card p-8"
      >
        <h3 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white mb-6 flex items-center gap-2">
          <ChartBarIcon className="w-6 h-6 text-green-500" />
          Monthly Progress
        </h3>
        <div className="text-center py-8">
          <ChartBarIcon className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-500 dark:text-surface-600">
            No monthly data available yet. Complete some workouts to see your progress!
          </p>
        </div>
      </motion.div>
    );
  }

  const recentMonths = stats.monthlyStats.slice(0, 6).reverse();
  const maxWorkouts = Math.max(...recentMonths.map(m => m.workoutsCount));
  const maxVolume = Math.max(...recentMonths.map(m => m.volume));
  const maxHours = Math.max(...recentMonths.map(m => m.trainingHours));

  return (
    <motion.div
      initial={noMotion ? {} : { opacity: 0, y: 20 }}
      animate={noMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="forge-card p-6"
    >
      <h3 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white mb-6 flex items-center gap-2">
        <ChartBarIcon className="w-6 h-6 text-green-500" />
        Monthly Progress
      </h3>

      <div className="space-y-6">
        {/* Workouts Chart */}
        <div>
          <h4 className="text-sm font-medium text-surface-500 dark:text-surface-600 mb-3">
            Workouts Completed
          </h4>
          <div className="space-y-2">
            {recentMonths.map((month, index) => {
              const percentage = maxWorkouts > 0 ? (month.workoutsCount / maxWorkouts) * 100 : 0;

              return (
                <motion.div
                  key={`${month.year}-${month.month}`}
                  initial={noMotion ? {} : { opacity: 0, x: -12 }}
                  animate={noMotion ? {} : { opacity: 1, x: 0 }}
                  transition={{ ...springSnappy, delay: noMotion ? 0 : index * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-16 text-sm text-surface-500 dark:text-surface-600">
                    {month.month} {month.year}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-8 bg-surface-200 dark:bg-surface-200 rounded-lg overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-lg flex items-center justify-end pr-2"
                        initial={noMotion ? {} : { width: '0%' }}
                        animate={noMotion ? {} : { width: `${percentage}%` }}
                        transition={{ ...springSnappy, delay: noMotion ? 0 : 0.3 + index * 0.06 }}
                      >
                        {month.workoutsCount > 0 && (
                          <span className="text-white text-sm font-medium">
                            {month.workoutsCount}
                          </span>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Volume Chart */}
        <div>
          <h4 className="text-sm font-medium text-surface-500 dark:text-surface-600 mb-3">
            Total Volume
          </h4>
          <div className="space-y-2">
            {recentMonths.map((month, index) => {
              const percentage = maxVolume > 0 ? (month.volume / maxVolume) * 100 : 0;

              return (
                <motion.div
                  key={`${month.year}-${month.month}-volume`}
                  initial={noMotion ? {} : { opacity: 0, x: -12 }}
                  animate={noMotion ? {} : { opacity: 1, x: 0 }}
                  transition={{ ...springSnappy, delay: noMotion ? 0 : index * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-16 text-sm text-surface-500 dark:text-surface-600">
                    {month.month} {month.year}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-8 bg-surface-200 dark:bg-surface-200 rounded-lg overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-forge-400 to-forge-700 rounded-lg flex items-center justify-end pr-2"
                        initial={noMotion ? {} : { width: '0%' }}
                        animate={noMotion ? {} : { width: `${percentage}%` }}
                        transition={{ ...springSnappy, delay: noMotion ? 0 : 0.3 + index * 0.06 }}
                      >
                        {month.volume > 0 && (
                          <span className="text-white text-sm font-medium">
                            {formatVolume(month.volume, useMetric)}
                          </span>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Training Hours Chart */}
        <div>
          <h4 className="text-sm font-medium text-surface-500 dark:text-surface-600 mb-3">
            Training Hours
          </h4>
          <div className="space-y-2">
            {recentMonths.map((month, index) => {
              const percentage = maxHours > 0 ? (month.trainingHours / maxHours) * 100 : 0;

              return (
                <motion.div
                  key={`${month.year}-${month.month}-hours`}
                  initial={noMotion ? {} : { opacity: 0, x: -12 }}
                  animate={noMotion ? {} : { opacity: 1, x: 0 }}
                  transition={{ ...springSnappy, delay: noMotion ? 0 : index * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-16 text-sm text-surface-500 dark:text-surface-600">
                    {month.month} {month.year}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-8 bg-surface-200 dark:bg-surface-200 rounded-lg overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg flex items-center justify-end pr-2"
                        initial={noMotion ? {} : { width: '0%' }}
                        animate={noMotion ? {} : { width: `${percentage}%` }}
                        transition={{ ...springSnappy, delay: noMotion ? 0 : 0.3 + index * 0.06 }}
                      >
                        {month.trainingHours > 0 && (
                          <span className="text-white text-sm font-medium">
                            {month.trainingHours.toFixed(1)}h
                          </span>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-300">
          <Link
            href="/progress"
            className="text-sm font-display font-semibold text-forge-500 dark:text-forge-400 hover:text-forge-600 dark:hover:text-forge-300 transition-colors inline-flex items-center gap-1"
          >
            View Full Progress
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
