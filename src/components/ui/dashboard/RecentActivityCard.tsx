import { ClockIcon } from '@heroicons/react/24/outline';
import { DashboardCard } from './DashboardCard';
import { ActivityEntry } from '@/types/dashboard';
import Link from 'next/link';

interface RecentActivityCardProps {
  activities: ActivityEntry[];
}

export function RecentActivityCard({ activities }: RecentActivityCardProps) {
  return (
    <DashboardCard
      title="Recent Activity"
      icon={<ClockIcon className="h-6 w-6" />}
      color="purple"
      className="relative"
    >
      <div className="divide-y divide-gray-200 dark:divide-gray-700 -mt-1">
        {activities.map((activity) => (
          <div key={activity.id} className="py-3">
            <p className="font-medium text-heading">{activity.title}</p>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-secondary">{activity.details}</p>
              <p className="text-xs text-secondary">{activity.timeAgo}</p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/activity"
        className="block text-center text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mt-4 text-sm font-medium"
      >
        View all activity
      </Link>
    </DashboardCard>
  );
}
