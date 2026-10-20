'use client';

import Link from 'next/link';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatPRValue, prTypeFromApi } from '@/utils/prFormatting';
import { DashboardCard } from '@/components/ui/dashboard/DashboardCard';

interface PersonalRecordsProps {
  stats: UserStatsData;
  useMetric: boolean;
  /** Unused: the full list is its own page now. Kept for call-site compatibility. */
  onViewAll?: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  weight: 'Heaviest',
  volume: 'Most volume',
  duration: 'Longest',
  distance: 'Farthest',
};

export function PersonalRecords({ stats, useMetric }: PersonalRecordsProps) {
  const records = stats.personalRecords ?? [];

  return (
    <DashboardCard
      title="Latest records"
      action={records.length > 0 ? { href: '/personal-records', label: 'All' } : undefined}
    >
      {records.length === 0 ? (
        <p className="py-4 text-sm text-surface-500 dark:text-surface-600">
          No records yet. Your first workout sets the baseline.
        </p>
      ) : (
        <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {records.slice(0, 5).map((record) => (
            <li
              key={`${record.exerciseKey}_${record.type}`}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <Link
                  href={`/exercise/${encodeURIComponent(record.exerciseName)}`}
                  className="block truncate text-sm font-medium text-surface-50 hover:text-accent-600 dark:text-white dark:hover:text-accent-400"
                >
                  {record.exerciseName}
                </Link>
                <p className="text-xs text-surface-500 dark:text-surface-600">
                  {TYPE_LABEL[record.type] ?? 'Record'} ·{' '}
                  {new Date(record.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <p className="shrink-0 font-display text-base font-semibold text-surface-50 dark:text-white tabular">
                {formatPRValue(record.value, prTypeFromApi(record.type), useMetric)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
