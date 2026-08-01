'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BoltIcon, ScaleIcon, CalendarDaysIcon, FireIcon } from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatVolume, formatWeight } from '@/utils/formatters';
import { springSnappy, springBouncy, springGentle } from '@/lib/motion';

interface TopExercisesProps {
  stats: UserStatsData;
  useMetric: boolean;
  onViewAll?: () => void;
}


export function TopExercises({ stats, useMetric, onViewAll }: TopExercisesProps) {
  const prefersReducedMotion = useReducedMotion();
  const noMotion = prefersReducedMotion ?? false;

  if (!stats.topExercises || stats.topExercises.length === 0) {
    return (
      <motion.div
        initial={noMotion ? {} : { opacity: 0, y: 20 }}
        animate={noMotion ? {} : { opacity: 1, y: 0 }}
        transition={springGentle}
        className="forge-card p-8"
      >
        <h3 className="text-xl font-display font-bold tracking-wide text-surface-50 dark:text-white mb-6 flex items-center gap-2">
          <BoltIcon className="w-6 h-6 text-accent-500" />
          Top Exercises
        </h3>
        <div className="text-center py-8">
          <BoltIcon className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-500 dark:text-surface-600">
            No exercise data available yet. Complete some workouts to see your top exercises!
          </p>
        </div>
      </motion.div>
    );
  }

  const topFour = stats.topExercises.slice(0, 4);
  const maxVolume = Math.max(...topFour.map(ex => ex.totalVolume));

  return (
    <motion.div
      initial={noMotion ? {} : { opacity: 0, y: 20 }}
      animate={noMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="forge-card p-6"
    >
      <h3 className="text-xl font-display font-bold tracking-wide text-surface-50 dark:text-white mb-6 flex items-center gap-2">
        <BoltIcon className="w-6 h-6 text-accent-500" />
        Top Exercises
      </h3>
      <div className="space-y-3">
        {topFour.map((exercise, index) => {
          // Guard against an all-zero dataset so we never render a NaN width.
          const volumePercentage = maxVolume > 0 ? (exercise.totalVolume / maxVolume) * 100 : 0;

          return (
            <motion.div
              key={exercise.exerciseKey}
              initial={noMotion ? {} : { opacity: 0, x: -16 }}
              animate={noMotion ? {} : { opacity: 1, x: 0 }}
              transition={{ ...springSnappy, delay: noMotion ? 0 : index * 0.07 }}
              className="relative p-4 bg-surface-950 dark:bg-surface-200/50 rounded-xl hover:bg-surface-900 dark:hover:bg-surface-200 transition-colors overflow-hidden"
            >
              {/* Volume progress bar background */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent-100/70 to-accent-200/50 dark:from-accent-900/30 dark:to-accent-800/20"
                  initial={noMotion ? {} : { width: '0%' }}
                  animate={noMotion ? {} : { width: `${volumePercentage}%` }}
                  transition={{ ...springSnappy, delay: noMotion ? 0 : 0.3 + index * 0.1 }}
                />
              </div>

              <div className="relative">
                {/* Name + rank */}
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="flex items-center justify-center w-8 h-8 bg-accent-100 dark:bg-accent-900/40 rounded-lg shrink-0"
                    initial={noMotion ? {} : { scale: 0 }}
                    animate={noMotion ? {} : { scale: 1 }}
                    transition={{ ...springBouncy, delay: noMotion ? 0 : 0.4 + index * 0.1 }}
                  >
                    <span className="text-sm font-display font-bold text-accent-600 dark:text-accent-400 tabular">
                      #{index + 1}
                    </span>
                  </motion.div>
                  <h4 className="font-display font-bold text-surface-50 dark:text-white leading-tight">
                    {exercise.name}
                  </h4>
                </div>

                {/* Metric strip */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/60 dark:bg-black/20 rounded-lg px-2.5 py-2 text-center backdrop-blur-sm">
                    <CalendarDaysIcon className="w-3.5 h-3.5 text-surface-500 dark:text-surface-600 mx-auto mb-1" />
                    <p className="text-sm font-display font-bold text-surface-50 dark:text-white tabular leading-none">
                      {exercise.sessionCount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-surface-500 dark:text-surface-600 uppercase tracking-wider mt-1">
                      Sessions
                    </p>
                  </div>
                  <div className="bg-white/60 dark:bg-black/20 rounded-lg px-2.5 py-2 text-center backdrop-blur-sm">
                    <ScaleIcon className="w-3.5 h-3.5 text-surface-500 dark:text-surface-600 mx-auto mb-1" />
                    <p className="text-sm font-display font-bold text-surface-50 dark:text-white tabular leading-none">
                      {formatWeight(exercise.maxWeight, useMetric)}
                    </p>
                    <p className="text-[10px] text-surface-500 dark:text-surface-600 uppercase tracking-wider mt-1">
                      Max
                    </p>
                  </div>
                  <div className="bg-accent-100/70 dark:bg-accent-900/30 rounded-lg px-2.5 py-2 text-center backdrop-blur-sm">
                    <FireIcon className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400 mx-auto mb-1" />
                    <p className="text-sm font-display font-bold text-accent-600 dark:text-accent-400 tabular leading-none">
                      {formatVolume(exercise.totalVolume, useMetric)}
                    </p>
                    <p className="text-[10px] text-accent-600/80 dark:text-accent-400/80 uppercase tracking-wider mt-1">
                      Volume
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      {stats.topExercises.length > 4 && (
        <motion.div
          className="mt-4 text-center"
          whileHover={noMotion ? {} : { scale: 1.03 }}
          whileTap={noMotion ? {} : { scale: 0.97 }}
          transition={springSnappy}
        >
          <button
            onClick={onViewAll}
            className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium text-sm inline-flex items-center gap-1 transition-colors"
          >
            View All Exercises ({stats.topExercises.length})
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
