import { ClockIcon, ScaleIcon, BoltIcon } from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatVolume } from '@/utils/formatters';

interface RecentActivityProps {
  stats: UserStatsData;
  useMetric: boolean;
  onViewAll?: () => void;
}

export function RecentActivity({ stats, useMetric, onViewAll }: RecentActivityProps) {

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // Compare dates by setting time to midnight to avoid time-of-day issues
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = nowOnly.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Format time
    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Format date based on recency
    let dateLabel = '';
    if (diffDays === 0) {
      dateLabel = 'Today';
    } else if (diffDays === 1) {
      dateLabel = 'Yesterday';
    } else if (diffDays <= 7) {
      dateLabel = date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      dateLabel = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }

    return `${dateLabel} at ${timeString}`;
  };

  if (!stats.recentSessions || stats.recentSessions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Recent Activity
        </h3>
        <div className="text-center py-8">
          <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No recent workouts found. Start your fitness journey today!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Recent Activity
      </h3>
      <div className="space-y-4">
        {stats.recentSessions.slice(0, 4).map((session, index) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {session.templateName}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatDateTime(session.completedAt)}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <ClockIcon className="w-4 h-4" />
                <span>{formatDuration(session.duration)}</span>
              </div>
              <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                <ScaleIcon className="w-4 h-4" />
                <span>{formatVolume(session.totalVolume, useMetric)}</span>
              </div>
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <BoltIcon className="w-4 h-4" />
                <span>{session.totalSets} sets</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {stats.recentSessions.length > 0 && onViewAll && (
        <div className="mt-4 text-center">
          <button
            onClick={onViewAll}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm inline-flex items-center gap-1 transition-colors"
          >
            View All Activity ({stats.recentSessions.length})
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
