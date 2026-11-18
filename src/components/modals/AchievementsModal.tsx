import { useState } from 'react';
import { ModalShell } from '@/components/ui/ModalShell';
import { TrophyIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { TIER_NAMES, CATEGORY_NAMES, AchievementCategory, localizeAchievement } from '@/types/achievements';
import { springSnappy } from '@/lib/motion';


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

  const allAchievements = Object.values(achievements).flat();

  // Sorted into a fresh array: the old code called .sort() on the array held
  // inside the React Query cache, mutating cached data as a side effect of
  // rendering.
  let filteredAchievements = selectedCategory === 'all'
    ? [...allAchievements]
    : [...(achievements[selectedCategory] || [])];

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

  // Always rendered through ModalShell so the AnimatePresence exit animation
  // can run — `if (!isOpen) return null` above it made the modal vanish with
  // no transition, the exact bug DashboardSettingsModal documents and fixed.
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Achievements"
      subtitle={`${unlockedCount} of ${totalCount} unlocked`}
      maxWidth="max-w-2xl"
    >
        {/* Filters as chips, the same control the records page uses. Two
            native selects hid the categories until opened. */}
        <div className="mb-2 space-y-2">
          <div className="scroll-touch -mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Category">
            {(['all', ...categories] as (AchievementCategory | 'all')[]).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={selectedCategory === c}
                onClick={() => setSelectedCategory(c)}
                className="chip shrink-0"
              >
                {c === 'all' ? 'All' : CATEGORY_NAMES[c]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Status">
            {(['all', 'unlocked', 'locked'] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filterUnlocked === f}
                onClick={() => setFilterUnlocked(f)}
                className="chip capitalize"
              >
                {f === 'all' ? 'Any status' : f}
              </button>
            ))}
            <span className="ml-auto text-xs text-surface-500 dark:text-surface-600 tabular">
              {filteredAchievements.length} shown
            </span>
          </div>
        </div>

        {/* The same row as the profile card: one design for an achievement,
            whether you see four of them or all of them. */}
        {filteredAchievements.length === 0 ? (
          <p className="py-10 text-center text-sm text-surface-500 dark:text-surface-600">
            No achievements match these filters.
          </p>
        ) : (
          <ul className="row-list">
            {filteredAchievements.map((achievement, index) => {
              const localized = localizeAchievement(achievement, useMetric);
              const pct = Math.min(100, (achievement.progress / localized.requirement) * 100);
              return (
                <motion.li
                  key={achievement.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ ...springSnappy, delay: Math.min(index * 0.02, 0.3) }}
                  className="flex items-start gap-3 py-3"
                >
                  <span
                    className={`mt-0.5 text-xl leading-none ${achievement.isUnlocked ? '' : 'opacity-40 grayscale'}`}
                    aria-hidden="true"
                  >
                    {achievement.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-surface-50 dark:text-white">
                        {achievement.name}
                        <span className="ml-1.5 text-xs font-normal text-surface-500 dark:text-surface-600">
                          {TIER_NAMES[achievement.tier as keyof typeof TIER_NAMES]}
                        </span>
                      </p>
                      <span className="shrink-0 text-xs text-surface-500 dark:text-surface-600 tabular">
                        {achievement.isUnlocked && achievement.unlockedAt
                          ? new Date(achievement.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          : `${Number(achievement.progress.toFixed(1)).toLocaleString()} / ${Number(localized.requirement.toFixed(1)).toLocaleString()}`}
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 dark:text-surface-600">{localized.description}</p>
                    {!achievement.isUnlocked && (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                        <div className="h-full rounded-full bg-award-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  {achievement.isUnlocked && (
                    <TrophyIcon className="mt-0.5 h-4 w-4 shrink-0 text-award-500" aria-label="Unlocked" />
                  )}
                </motion.li>
              );
            })}
          </ul>
        )}
    </ModalShell>
  );
}
