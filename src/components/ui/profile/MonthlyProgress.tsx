'use client';

import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatVolume } from '@/utils/formatters';
import { DashboardCard } from '@/components/ui/dashboard/DashboardCard';

interface MonthlyProgressProps {
  stats: UserStatsData;
  useMetric: boolean;
}

/**
 * The last six months as one table, newest first.
 *
 * Was three stacked bar charts — workouts, volume, hours — each repeating the
 * same six month labels in a 64px column that "September 2026" did not fit,
 * in three different gradient colours. One row per month answers "how did
 * this month compare?" in a single scan.
 */
export function MonthlyProgress({ stats, useMetric }: MonthlyProgressProps) {
  const months = (stats.monthlyStats ?? []).slice(0, 6);
  const maxWorkouts = Math.max(1, ...months.map((m) => m.workoutsCount));

  return (
    <DashboardCard title="By month" action={{ href: '/progress', label: 'Progress' }}>
      {months.length === 0 ? (
        <p className="py-4 text-sm text-surface-500 dark:text-surface-600">
          Monthly totals appear after your first workout.
        </p>
      ) : (
        <table className="w-full text-sm tabular">
          <thead>
            <tr className="text-left">
              <th className="stat-label pb-2 font-medium">Month</th>
              <th className="stat-label pb-2 font-medium">Workouts</th>
              <th className="stat-label pb-2 text-right font-medium">Volume</th>
              <th className="stat-label pb-2 text-right font-medium">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {months.map((month) => (
              <tr key={`${month.year}-${month.month}`}>
                <td className="py-2 pr-2 text-surface-300 dark:text-surface-900">
                  {month.month.slice(0, 3)} <span className="text-surface-500 dark:text-surface-600">{String(month.year).slice(2)}</span>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-surface-50 dark:text-white">{month.workoutsCount}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
                      <span
                        className="block h-full rounded-full bg-accent-500"
                        style={{ width: `${(month.workoutsCount / maxWorkouts) * 100}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className="py-2 text-right text-surface-50 dark:text-white">
                  {month.volume > 0 ? formatVolume(month.volume, useMetric) : '—'}
                </td>
                <td className="py-2 pl-3 text-right text-surface-50 dark:text-white">{month.trainingHours.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DashboardCard>
  );
}
