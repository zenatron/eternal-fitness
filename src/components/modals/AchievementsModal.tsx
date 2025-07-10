import { useState } from 'react';
import { XMarkIcon, TrophyIcon, FunnelIcon } from '@heroicons/react/24/outline';
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

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Record<AchievementCategory, AchievementData[]>;
  unlockedCount: number;
  totalCount: number;
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

export function AchievementsModal({ 
  isOpen, 
  onClose, 
  achievements, 
  unlockedCount, 
  totalCount 
}: AchievementsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [filterUnlocked, setFilterUnlocked] = useState<'all' | 'unlocked' | 'locked'>('all');

  if (!isOpen) return null;

  // Get all achievements
  const allAchievements = Object.values(achievements).flat();
  
  // Filter achievements
  let filteredAchievements = selectedCategory === 'all' 
    ? allAchievements 
    : achievements[selectedCategory] || [];

  if (filterUnlocked === 'unlocked') {
    filteredAchievements = filteredAchievements.filter(a => a.isUnlocked);
  } else if (filterUnlocked === 'locked') {
    filteredAchievements = filteredAchievements.filter(a => !a.isUnlocked);
  }

  // Sort by tier and progress
  filteredAchievements.sort((a, b) => {
    if (a.isUnlocked !== b.isUnlocked) {
      return a.isUnlocked ? -1 : 1; // Unlocked first
    }
    return b.progressPercentage - a.progressPercentage; // Higher progress first
  });

  const categories = Object.keys(achievements) as AchievementCategory[];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <TrophyIcon className="w-8 h-8 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Achievements
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {unlockedCount} of {totalCount} achievements unlocked
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filters:
              </span>
            </div>
            
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as AchievementCategory | 'all')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {CATEGORY_NAMES[category]}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterUnlocked}
              onChange={(e) => setFilterUnlocked(e.target.value as 'all' | 'unlocked' | 'locked')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Achievements</option>
              <option value="unlocked">Unlocked Only</option>
              <option value="locked">Locked Only</option>
            </select>

            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredAchievements.length} achievements
            </div>
          </div>
        </div>

        {/* Achievement Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAchievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`bg-gray-50 dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden ${
                  achievement.isUnlocked ? 'ring-2 ring-yellow-400' : ''
                }`}
              >
                <div className={`h-3 bg-gradient-to-r ${
                  achievement.isUnlocked 
                    ? TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS]
                    : 'from-gray-300 to-gray-400'
                }`} />
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-4xl ${achievement.isUnlocked ? '' : 'grayscale opacity-50'}`}>
                        {achievement.isUnlocked ? achievement.icon : '🔒'}
                      </span>
                      <div>
                        <h4 className={`font-bold text-lg ${
                          achievement.isUnlocked 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {achievement.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {TIER_NAMES[achievement.tier as keyof typeof TIER_NAMES]} • {CATEGORY_NAMES[achievement.category]}
                        </p>
                      </div>
                    </div>
                    {achievement.isUnlocked && (
                      <TrophyIcon className="w-8 h-8 text-yellow-500" />
                    )}
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {achievement.description}
                  </p>

                  {/* Progress Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className={`font-medium ${
                        achievement.isUnlocked 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {achievement.progress.toLocaleString()} / {achievement.requirement.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          achievement.isUnlocked 
                            ? 'bg-gradient-to-r from-green-400 to-green-600'
                            : 'bg-gradient-to-r from-blue-400 to-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, achievement.progressPercentage)}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <span className={`text-lg font-bold ${
                        achievement.isUnlocked 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {Math.round(achievement.progressPercentage)}%
                      </span>
                    </div>
                  </div>

                  {achievement.isUnlocked && achievement.unlockedAt && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredAchievements.length === 0 && (
            <div className="text-center py-12">
              <TrophyIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No achievements found with the current filters.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
