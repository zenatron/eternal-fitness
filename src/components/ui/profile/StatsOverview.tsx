'use client';

import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatVolume } from '@/utils/formatters';

interface StatsOverviewProps {
  stats: UserStatsData;
  useMetric: boolean;
}

/**
 * Lifetime totals as one compact grid of figures.
 *
 * Was six full-width cards, each with its own colour stripe, tinted icon tile
 * and bouncy hover — a screen and a half of scrolling for six numbers, in five
 * unrelated colours that meant nothing.
 */
export function StatsOverview({ stats, useMetric }: StatsOverviewProps) {
  const figures = [
    { label: 'Workouts', value: stats.totalWorkouts.toLocaleString() },
    { label: 'Sets', value: stats.totalSets.toLocaleString() },
    { label: 'Volume', value: formatVolume(stats.totalVolume, useMetric) },
    { label: 'Hours', value: stats.totalTrainingHours.toFixed(1) },
    { label: 'Streak', value: `${stats.currentStreak}`, note: `best ${stats.longestStreak}` },
    { label: 'Active weeks', value: stats.activeWeeks.toString() },
  ];

  return (
    <dl className="forge-card grid grid-cols-2 gap-px overflow-hidden bg-black/[0.06] dark:bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-6">
      {figures.map((figure) => (
        <div key={figure.label} className="bg-white px-4 py-3.5 dark:bg-surface-100">
          <dt className="stat-label">{figure.label}</dt>
          <dd className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-display text-xl font-semibold text-surface-50 dark:text-white tabular">
              {figure.value}
            </span>
            {figure.note && (
              <span className="text-xs text-surface-500 dark:text-surface-600 tabular">{figure.note}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
