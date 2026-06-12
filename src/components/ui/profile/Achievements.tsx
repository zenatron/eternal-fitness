'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { TrophyIcon } from '@heroicons/react/24/outline';
import { TIER_COLORS, TIER_NAMES, AchievementCategory, localizeAchievement } from '@/types/achievements';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

interface AchievementData {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  tier: string;
  requirement: number;
  icon: string;
  color: string;
  isUnlocked: boolean;
  progress: number;
  progressPercentage: number;
  unlockedAt?: string;
}

interface AchievementsProps {
  achievements: Record<AchievementCategory, AchievementData[]>;
  unlockedCount: number;
  totalCount: number;
  useMetric: boolean;
  onViewAll?: () => void;
}

export function Achievements({ achievements, unlockedCount, totalCount, useMetric, onViewAll }: AchievementsProps) {
  const prefersReducedMotion = useReducedMotion();
  const noMotion = prefersReducedMotion ?? false;

  const percentComplete = Math.round((unlockedCount / totalCount) * 100);

  const closestAchievements = Object.values(achievements)
    .flat()
    .filter(achievement => !achievement.isUnlocked && achievement.progressPercentage > 0)
    .sort((a, b) => b.progressPercentage - a.progressPercentage)
    .slice(0, 3);

  const displayAchievements = closestAchievements.length > 0
    ? closestAchievements
    : Object.values(achievements)
        .flat()
        .filter(achievement => achievement.tier === 'bronze')
        .slice(0, 3);

  return (
    <motion.div
      className="space-y-6"
      initial={noMotion ? {} : { opacity: 0, y: 20 }}
      animate={noMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white flex items-center gap-2">
          <TrophyIcon className="w-6 h-6 text-yellow-500" />
          Achievements
        </h2>
        {onViewAll && (
          <motion.button
            onClick={onViewAll}
            className="text-blue-500 hover:text-forge-600 text-sm font-medium"
            whileHover={noMotion ? {} : { scale: 1.03 }}
            whileTap={noMotion ? {} : { scale: 0.97 }}
            transition={springSnappy}
          >
            View All
          </motion.button>
        )}
      </div>

      {/* Achievement Summary */}
      <motion.div
        className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-6 mb-6"
        initial={noMotion ? {} : { scale: 0.95, opacity: 0 }}
        animate={noMotion ? {} : { scale: 1, opacity: 1 }}
        transition={{ ...springBouncy, delay: noMotion ? 0 : 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-display font-bold text-surface-800 dark:text-white">
              Progress Overview
            </h3>
            <p className="text-surface-500 dark:text-surface-600">
              {unlockedCount} of {totalCount} achievements unlocked
            </p>
          </div>
          <div className="text-right">
            <motion.div
              className="text-3xl font-display font-bold tracking-wide text-yellow-600 dark:text-yellow-400"
              initial={noMotion ? {} : { scale: 0, rotate: -180 }}
              animate={noMotion ? {} : { scale: 1, rotate: 0 }}
              transition={{ ...springBouncy, delay: noMotion ? 0 : 0.3 }}
            >
              {percentComplete}%
            </motion.div>
            <div className="text-sm text-surface-500 dark:text-surface-600">Complete</div>
          </div>
        </div>

        <div className="mt-4 bg-surface-200 dark:bg-surface-200 rounded-full h-3 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-yellow-400 to-ember-500 h-3 rounded-full"
            initial={noMotion ? {} : { width: '0%' }}
            animate={noMotion ? {} : { width: `${percentComplete}%` }}
            transition={{ ...springSnappy, delay: noMotion ? 0 : 0.3 }}
          />
        </div>
      </motion.div>

      {/* Next Achievements to Unlock */}
      <div>
        <h3 className="text-lg font-display font-bold text-surface-800 dark:text-white mb-4">
          {closestAchievements.length > 0 ? 'Closest to Achieving' : 'Get Started'}
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {displayAchievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={noMotion ? {} : { opacity: 0, x: -20 }}
              animate={noMotion ? {} : { opacity: 1, x: 0 }}
              transition={{ ...springSnappy, delay: noMotion ? 0 : index * 0.08 }}
              className="forge-card p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <motion.span
                    className={`text-3xl ${achievement.isUnlocked ? '' : 'grayscale opacity-75'}`}
                    initial={noMotion ? {} : { scale: 0 }}
                    animate={noMotion ? {} : { scale: 1 }}
                    transition={{ ...springBouncy, delay: noMotion ? 0 : 0.2 + index * 0.08 }}
                  >
                    {achievement.icon}
                  </motion.span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-display font-bold text-surface-800 dark:text-white truncate">
                      {achievement.name}
                    </h4>
                    <motion.span
                      className={`text-sm px-2 py-1 rounded-full ${
                        TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS]
                          ? `bg-gradient-to-r ${TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS]} text-white`
                          : 'bg-surface-100 dark:bg-surface-200 text-surface-500 dark:text-surface-600'
                      }`}
                      initial={noMotion ? {} : { scale: 0, opacity: 0 }}
                      animate={noMotion ? {} : { scale: 1, opacity: 1 }}
                      transition={{ ...springBouncy, delay: noMotion ? 0 : 0.3 + index * 0.08 }}
                    >
                      {TIER_NAMES[achievement.tier as keyof typeof TIER_NAMES]}
                    </motion.span>
                  </div>

                  {(() => {
                    const localized = localizeAchievement(achievement, useMetric);
                    const progressPct = Math.min(100, (achievement.progress / localized.requirement) * 100);
                    return (
                      <>
                        <p className="text-sm text-surface-500 dark:text-surface-600 mb-3">
                          {localized.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-surface-500 dark:text-surface-600">Progress</span>
                            <span className="font-medium text-surface-600 dark:text-surface-800">
                              {achievement.progress.toLocaleString()} / {localized.requirement.toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-surface-200 dark:bg-surface-200 rounded-full h-2 overflow-hidden">
                            <motion.div
                              className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                              initial={noMotion ? {} : { width: '0%' }}
                              animate={noMotion ? {} : { width: `${Math.min(100, progressPct)}%` }}
                              transition={{ ...springSnappy, delay: noMotion ? 0 : 0.25 + index * 0.08 }}
                            />
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-forge-600 dark:text-forge-400">
                              {Math.round(progressPct)}% Complete
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {displayAchievements.length === 0 && (
          <div className="text-center py-8 bg-surface-950 dark:bg-surface-100 rounded-xl">
            <TrophyIcon className="w-12 h-12 text-surface-600 mx-auto mb-3" />
            <p className="text-surface-500 dark:text-surface-600 mb-2">
              No achievements in progress
            </p>
            <p className="text-sm text-surface-600 dark:text-surface-500">
              Complete some workouts to start earning achievements!
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
