'use client';

import { TIER_NAMES, AchievementCategory, localizeAchievement } from '@/types/achievements';
import { DashboardCard } from '@/components/ui/dashboard/DashboardCard';

/** Wire shape of one achievement as returned by GET /api/user/achievements. */
export interface AchievementData {
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

/**
 * The few achievements nearest to unlocking, each with its progress.
 *
 * Was a gold gradient "Progress Overview" banner with a spinning percentage,
 * then each candidate in its own card with a gradient tier pill and a separate
 * "NN% Complete" line under its bar.
 */
export function Achievements({ achievements, unlockedCount, totalCount, useMetric, onViewAll }: AchievementsProps) {
  const all = Object.values(achievements).flat();
  const closest = all
    .filter((a) => !a.isUnlocked && a.progressPercentage > 0)
    .sort((a, b) => b.progressPercentage - a.progressPercentage)
    .slice(0, 4);
  const shown = closest.length > 0 ? closest : all.filter((a) => a.tier === 'bronze').slice(0, 4);

  return (
    <DashboardCard title="Achievements" action={onViewAll ? { onClick: onViewAll, label: 'All' } : undefined}>
      <p className="mb-4 text-sm text-surface-500 dark:text-surface-600 tabular">
        <span className="font-semibold text-surface-50 dark:text-white">{unlockedCount}</span> of {totalCount} unlocked
        {closest.length > 0 && ' · closest next'}
      </p>
      {shown.length === 0 ? (
        <p className="text-sm text-surface-500 dark:text-surface-600">Every achievement is unlocked.</p>
      ) : (
        <ul className="space-y-3.5">
          {shown.map((achievement) => {
            const localized = localizeAchievement(achievement, useMetric);
            const pct = Math.min(100, (achievement.progress / localized.requirement) * 100);
            return (
              <li key={achievement.id} className="flex items-start gap-3">
                <span className="mt-0.5 text-xl leading-none grayscale-[60%]" aria-hidden="true">
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
                      {Number(achievement.progress.toFixed(1)).toLocaleString()} /{' '}
                      {Number(localized.requirement.toFixed(1)).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 dark:text-surface-600">{localized.description}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                    <div className="h-full rounded-full bg-award-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
