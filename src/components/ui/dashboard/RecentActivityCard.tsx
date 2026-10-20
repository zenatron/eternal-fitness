import { ActivityEntry } from '@/types/dashboard';
import { formatTimeAgo } from '@/utils/relativeTime';
import { useNow } from '@/lib/hooks/useNow';
import { DashboardCard } from './DashboardCard';

interface RecentActivityCardProps {
  activities: ActivityEntry[];
}

export function RecentActivityCard({ activities }: RecentActivityCardProps) {
  // Ages the labels while the page stays open; the payload only carries the
  // timestamp, so nothing here can go stale in the query cache.
  const now = useNow();

  return (
    <DashboardCard title="Recent workouts" action={{ href: '/history', label: 'History' }} className="h-full">
      {activities.length === 0 ? (
        <p className="py-4 text-sm text-surface-500 dark:text-surface-600">
          Nothing logged yet. Your workouts will show up here.
        </p>
      ) : (
        <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {activities.map((activity) => (
            <li key={activity.id} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-surface-50 dark:text-white">{activity.title}</p>
                {/* The time used to appear twice per row ("Completed 2d ago … 2d ago"). */}
                {activity.volumeLabel && (
                  <p className="text-xs text-surface-500 dark:text-surface-600 tabular">
                    {activity.volumeLabel} volume
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-surface-500 dark:text-surface-600 tabular">
                {formatTimeAgo(activity.completedAt, now ?? Date.now())}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
