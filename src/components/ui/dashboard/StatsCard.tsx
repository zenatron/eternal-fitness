import { UserIcon } from '@heroicons/react/24/outline';
import { DashboardCard } from './DashboardCard';
import { StatsGrid } from './StatsGrid';
import { StatsData } from '@/types/dashboard';
import Link from 'next/link';

interface StatsCardProps {
  data: StatsData;
}

export function StatsCard({ data }: StatsCardProps) {
  const statsItems = [
    { value: data.totalWorkouts, label: 'sessions' },
    { value: data.hoursTrained.toFixed(1), label: 'hours' },
    { value: data.totalExercises, label: 'exercises' },
    { value: data.activeWeeks, label: 'weeks' },
  ];

  return (
    <DashboardCard
      title="Your Stats"
      icon={<UserIcon className="h-6 w-6" />}
      color="cyan"
    >
      <StatsGrid stats={statsItems} columns={4} className="mb-4" />

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium text-heading">Total Volume</p>
            <p className="text-xs text-secondary">All exercises combined</p>
          </div>
          <p className="text-2xl font-bold text-heading">
            {data.totalVolume.amount.toLocaleString()}
            <span className="text-sm ml-1">{data.totalVolume.unit}</span>
          </p>
        </div>
        <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full"
            style={{ width: `${data.totalVolume.displayPercentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-secondary mt-1 text-right">
          Up {data.totalVolume.percentIncrease}% from last month
        </p>
      </div>

      <Link
        href="/profile"
        className="btn btn-secondary w-full mt-4 inline-flex items-center justify-center"
      >
        View Full Stats
      </Link>
    </DashboardCard>
  );
}
