'use client';

import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatVolume } from '@/utils/formatters';
import { formatDurationCompact } from '@/utils/durationUtils';
import { formatSessionDateTime } from '@/utils/relativeTime';
import { DashboardCard } from '@/components/ui/dashboard/DashboardCard';

interface RecentActivityProps {
  stats: UserStatsData;
  useMetric: boolean;
  onViewAll?: () => void;
}

export function RecentActivity({ stats, useMetric, onViewAll }: RecentActivityProps) {
  const sessions = stats.recentSessions ?? [];

  return (
    <DashboardCard
      title="Recent workouts"
      action={sessions.length > 0 && onViewAll ? { onClick: onViewAll, label: 'All' } : undefined}
    >
      {sessions.length === 0 ? (
        <p className="py-4 text-sm text-surface-500 dark:text-surface-600">
          No workouts yet. Finish one and it lands here.
        </p>
      ) : (
        <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {sessions.slice(0, 5).map((session) => (
            <li key={session.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium text-surface-50 dark:text-white">{session.templateName}</p>
                <p className="shrink-0 text-xs text-surface-500 dark:text-surface-600">
                  {formatSessionDateTime(session.completedAt)}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-600 tabular">
                {formatDurationCompact(session.duration)} · {session.totalSets}{' '}
                {session.totalSets === 1 ? 'set' : 'sets'}
                {session.totalVolume > 0 && <> · {formatVolume(session.totalVolume, useMetric)}</>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
