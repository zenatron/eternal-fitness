import { useState } from 'react';
import { ModalShell } from '@/components/ui/ModalShell';
import { TrophyIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { TIER_COLORS, TIER_NAMES, CATEGORY_NAMES, AchievementCategory, localizeAchievement } from '@/types/achievements';
import { springSnappy, springBouncy, springGentle } from '@/lib/motion';


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
  useMetric: boolean;
}

// CATEGORY_NAMES imported from @/types/achievements

export function AchievementsModal({
  isOpen,
  onClose,
  achievements,
  unlockedCount,
  totalCount,
  useMetric,
}: AchievementsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [filterUnlocked, setFilterUnlocked] = useState<'all' | 'unlocked' | 'locked'>('all');

  if (!isOpen) return null;

  const allAchievements = Object.values(achievements).flat();
  
  let filteredAchievements = selectedCategory === 'all' 
    ? allAchievements 
    : achievements[selectedCategory] || [];

  if (filterUnlocked === 'unlocked') {
    filteredAchievements = filteredAchievements.filter(a => a.isUnlocked);
  } else if (filterUnlocked === 'locked') {
    filteredAchievements = filteredAchievements.filter(a => !a.isUnlocked);
  }

  filteredAchievements.sort((a, b) => {
    if (a.isUnlocked !== b.isUnlocked) {
      return a.isUnlocked ? -1 : 1;
    }
    return b.progressPercentage - a.progressPercentage;
  });

  const categories = Object.keys(achievements) as AchievementCategory[];

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Achievements"
      subtitle={`${unlockedCount} of ${totalCount} unlocked`}
      maxWidth="max-w-5xl"
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-award-100 dark:bg-award-900/30">
          <TrophyIcon className="h-5 w-5 text-award-500" />
        </div>
      }
    >
        {/* Filters — full-width selects on mobile; the row could not fit two
            dropdowns and a count side by side on a phone. */}
        <div className="mb-4 border-b border-surface-900 pb-4 dark:border-surface-300">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <FunnelIcon className="w-5 h-5 text-surface-500" />
            </div>
            
            {/* Category Filter */}
            <motion.div className="flex-1 sm:flex-none" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springSnappy}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as AchievementCategory | 'all')}
                className="form-input !py-2 !px-3 text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {CATEGORY_NAMES[category]}
                  </option>
                ))}
              </select>
            </motion.div>

            {/* Status Filter */}
            <motion.div className="flex-1 sm:flex-none" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springSnappy}>
              <select
                value={filterUnlocked}
                onChange={(e) => setFilterUnlocked(e.target.value as 'all' | 'unlocked' | 'locked')}
                className="form-input !py-2 !px-3 text-sm"
              >
                <option value="all">All Achievements</option>
                <option value="unlocked">Unlocked Only</option>
                <option value="locked">Locked Only</option>
              </select>
            </motion.div>

            <div className="text-xs text-surface-500 dark:text-surface-600 sm:ml-auto sm:text-sm">
              {filteredAchievements.length} shown
            </div>
          </div>
        </div>

        {/* Achievement Grid */}
        <div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredAchievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springSnappy, delay: index * 0.05 }}
                className={`bg-surface-950 dark:bg-surface-200 rounded-xl shadow-lg overflow-hidden ${
                  achievement.isUnlocked ? 'ring-2 ring-award-400' : ''
                }`}
              >
                <motion.div
                  className={`h-3 bg-gradient-to-r ${
                    achievement.isUnlocked 
                      ? TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS]
                      : 'from-surface-300 to-surface-400'
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ ...springBouncy, delay: index * 0.05 + 0.1 }}
                  style={{ transformOrigin: 'left' }}
                />
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <motion.span
                        className={`text-4xl ${achievement.isUnlocked ? '' : 'grayscale opacity-50'}`}
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ ...springBouncy, delay: index * 0.05 + 0.15 }}
                      >
                        {achievement.isUnlocked ? achievement.icon : '🔒'}
                      </motion.span>
                      <div>
                        <h4 className={`font-bold text-lg ${
                          achievement.isUnlocked 
                            ? 'text-surface-50 dark:text-white' 
                            : 'text-surface-500 dark:text-surface-600'
                        }`}>
                          {achievement.name}
                        </h4>
                        <p className="text-sm text-surface-500 dark:text-surface-600">
                          {TIER_NAMES[achievement.tier as keyof typeof TIER_NAMES]} • {CATEGORY_NAMES[achievement.category]}
                        </p>
                      </div>
                    </div>
                    {achievement.isUnlocked && (
                      <motion.div
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ ...springBouncy, delay: index * 0.05 + 0.2 }}
                      >
                        <TrophyIcon className="w-8 h-8 text-award-500" />
                      </motion.div>
                    )}
                  </div>

                  {(() => {
                    const localized = localizeAchievement(achievement, useMetric);
                    const progressPct = Math.min(100, (achievement.progress / localized.requirement) * 100);
                    return (
                      <>
                        <p className="text-surface-500 dark:text-surface-600 mb-6">
                          {localized.description}
                        </p>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-surface-500 dark:text-surface-600">Progress</span>
                            <span className={`font-medium ${
                              achievement.isUnlocked
                                ? 'text-success-600 dark:text-success-400'
                                : 'text-surface-500 dark:text-surface-600'
                            }`}>
                              {Number(achievement.progress.toFixed(2)).toLocaleString()} / {Number(localized.requirement.toFixed(2)).toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-surface-900 dark:bg-surface-300/60 rounded-full h-3 overflow-hidden">
                            <motion.div
                              className={`h-3 rounded-full ${
                                achievement.isUnlocked
                                  ? 'bg-gradient-to-r from-success-400 to-success-600'
                                  : 'bg-gradient-to-r from-info-400 to-info-600'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, progressPct)}%` }}
                              transition={{ ...springBouncy, delay: index * 0.05 + 0.1 }}
                            />
                          </div>
                          <div className="text-center">
                            <motion.span
                              className={`text-lg font-display font-bold ${
                                achievement.isUnlocked
                                  ? 'text-success-600 dark:text-success-400'
                                  : 'text-accent-600 dark:text-accent-400'
                              }`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ ...springGentle, delay: index * 0.05 + 0.3 }}
                            >
                              {Math.round(progressPct)}%
                            </motion.span>
                          </div>
                        </div>

                        {achievement.isUnlocked && achievement.unlockedAt && (
                          <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-400">
                            <p className="text-xs text-surface-500 dark:text-surface-600">
                              Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredAchievements.length === 0 && (
            <div className="text-center py-12">
              <TrophyIcon className="w-16 h-16 text-surface-600 mx-auto mb-4" />
              <p className="text-surface-500 dark:text-surface-600">
                No achievements found with the current filters.
              </p>
            </div>
          )}
        </div>
    </ModalShell>
  );
}
