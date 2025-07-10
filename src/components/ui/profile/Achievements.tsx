import { useState } from 'react';
import { TrophyIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { TIER_COLORS, TIER_NAMES, AchievementCategory } from '@/types/achievements';

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
  onViewAll?: () => void;
}

const CATEGORY_NAMES = {
  volume_lifted: 'Volume Lifted',
  workouts_completed: 'Workouts Completed',
  unique_exercises: 'Exercise Variety',
  workout_hours: 'Training Hours',
  consistency_streak: 'Consistency',
  personal_records: 'Personal Records',
  heavy_lifter: 'Heavy Lifter',
  endurance: 'Endurance',
  dedication: 'Dedication'
};

export function Achievements({ achievements, unlockedCount, totalCount, onViewAll }: AchievementsProps) {
  // Get top 3 closest to achieving (highest progress percentage, not yet unlocked)
  const closestAchievements = Object.values(achievements)
    .flat()
    .filter(achievement => !achievement.isUnlocked && achievement.progressPercentage > 0)
    .sort((a, b) => b.progressPercentage - a.progressPercentage)
    .slice(0, 3);

  // If no progress on any achievements, show the first 3 bronze achievements
  const displayAchievements = closestAchievements.length > 0
    ? closestAchievements
    : Object.values(achievements)
        .flat()
        .filter(achievement => achievement.tier === 'bronze')
        .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <TrophyIcon className="w-6 h-6 text-yellow-500" />
          Achievements
        </h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-blue-500 hover:text-blue-600 text-sm font-medium"
          >
            View All
          </button>
        )}
      </div>

      {/* Achievement Summary */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Progress Overview
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {unlockedCount} of {totalCount} achievements unlocked
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {Math.round((unlockedCount / totalCount) * 100)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Complete</div>
          </div>
        </div>

        <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Next Achievements to Unlock */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          {closestAchievements.length > 0 ? 'Closest to Achieving' : 'Get Started'}
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {displayAchievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <span className={`text-3xl ${achievement.isUnlocked ? '' : 'grayscale opacity-75'}`}>
                    {achievement.isUnlocked ? achievement.icon : achievement.icon}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                      {achievement.name}
                    </h4>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS]
                        ? `bg-gradient-to-r ${TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS]} text-white`
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {TIER_NAMES[achievement.tier as keyof typeof TIER_NAMES]}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {achievement.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Progress</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {achievement.progress.toLocaleString()} / {achievement.requirement.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, achievement.progressPercentage)}%` }}
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {Math.round(achievement.progressPercentage)}% Complete
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {displayAchievements.length === 0 && (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <TrophyIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No achievements in progress
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Complete some workouts to start earning achievements!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
