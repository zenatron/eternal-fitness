import { StatsData } from '@/types/dashboard';
import { formatVolume } from '@/utils/formatters';
import { DashboardCard } from './DashboardCard';

interface StatsCardProps {
  data: StatsData;
}

const statDefs = [
  { label: 'Workouts', value: (d: StatsData) => d.totalWorkouts.toLocaleString() },
  { label: 'Hours', value: (d: StatsData) => d.hoursTrained.toFixed(1) },
  { label: 'Volume', value: (d: StatsData) => formatVolume(d.totalVolume.amount, d.totalVolume.unit === 'kg') },
  { label: 'Active weeks', value: (d: StatsData) => String(d.activeWeeks) },
];

export function StatsCard({ data }: StatsCardProps) {
  const change = data.totalVolume.percentIncrease;

  return (
    <DashboardCard title="All time" action={{ href: '/profile', label: 'Profile' }} className="h-full">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        {statDefs.map((stat) => (
          <div key={stat.label}>
            <dt className="stat-label">{stat.label}</dt>
            <dd className="mt-1.5 font-display text-xl font-semibold leading-none text-surface-50 dark:text-white tabular">
              {stat.value(data)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 border-t border-black/[0.06] pt-3 text-xs text-surface-500 dark:border-white/[0.06] dark:text-surface-600">
        Volume this month{' '}
        {/* Signed delta: the API computes negatives, and rendering them after a
            hard-coded "+" once produced "+-35%". */}
        <span
          className={`font-semibold tabular ${
            change >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
          }`}
        >
          {change >= 0 ? '+' : ''}
          {change}%
        </span>{' '}
        vs last month
      </p>
    </DashboardCard>
  );
}
