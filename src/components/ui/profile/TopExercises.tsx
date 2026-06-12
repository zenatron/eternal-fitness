'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BoltIcon, ScaleIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatVolume } from '@/utils/formatters';

interface TopExercisesProps {
  stats: UserStatsData;
  useMetric: boolean;
  onViewAll?: () => void;
}

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

export function TopExercises({ stats, useMetric, onViewAll }: TopExercisesProps) {
  const prefersReducedMotion = useReducedMotion();
  const noMotion = prefersReducedMotion ?? false;

  const formatWeight = (weight: number) => {
    const unit = useMetric ? 'kg' : 'lbs';
    return `${weight.toFixed(1)} ${unit}`;
  };

  if (!stats.topExercises || stats.topExercises.length === 0) {
    return (
      <motion.div
        initial={noMotion ? {} : { opacity: 0, y: 20 }}
        animate={noMotion ? {} : { opacity: 1, y: 0 }}
        transition={springGentle}
        className="forge-card p-8"
      >
        <h3 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white mb-6 flex items-center gap-2">
          <BoltIcon className="w-6 h-6 text-blue-500" />
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

  const maxVolume = Math.max(...stats.topExercises.map(ex => ex.totalVolume));

  return (
    <motion.div
      initial={noMotion ? {} : { opacity: 0, y: 20 }}
      animate={noMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="forge-card p-6"
    >
      <h3 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white mb-6 flex items-center gap-2">
        <BoltIcon className="w-6 h-6 text-blue-500" />
        Top Exercises
      </h3>
      <div className="space-y-4">
        {stats.topExercises.slice(0, 4).map((exercise, index) => {
          const volumePercentage = (exercise.totalVolume / maxVolume) * 100;

          return (
            <motion.div
              key={exercise.exerciseKey}
              initial={noMotion ? {} : { opacity: 0, x: -16 }}
              animate={noMotion ? {} : { opacity: 1, x: 0 }}
              transition={{ ...springSnappy, delay: noMotion ? 0 : index * 0.07 }}
              className="relative p-4 bg-surface-950 dark:bg-surface-200/50 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors overflow-hidden"
            >
              {/* Progress bar background */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-forge-800/30"
                  initial={noMotion ? {} : { width: '0%' }}
                  animate={noMotion ? {} : { width: `${volumePercentage}%` }}
                  transition={{ ...springSnappy, delay: noMotion ? 0 : 0.3 + index * 0.1 }}
                />
              </div>

              {/* Content */}
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="flex items-center justify-center w-8 h-8 bg-forge-100 dark:bg-forge-900/30 rounded-lg"
                    initial={noMotion ? {} : { scale: 0 }}
                    animate={noMotion ? {} : { scale: 1 }}
                    transition={{ ...springBouncy, delay: noMotion ? 0 : 0.4 + index * 0.1 }}
                  >
                    <span className="text-sm font-bold text-forge-600 dark:text-forge-400">
                      #{index + 1}
                    </span>
                  </motion.div>
                  <div>
                    <h4 className="font-display font-bold text-surface-800 dark:text-white">
                      {exercise.name}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-surface-500 dark:text-surface-600">
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
                  <p className="text-lg font-display font-bold text-forge-600 dark:text-forge-400">
                    {formatVolume(exercise.totalVolume, useMetric)}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-600">
                    Total Volume
                  </p>
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
            className="text-forge-600 dark:text-forge-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm inline-flex items-center gap-1 transition-colors"
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
