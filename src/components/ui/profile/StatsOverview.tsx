import {
  TrophyIcon,
  FireIcon,
  ClockIcon,
  ScaleIcon,
  CalendarDaysIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';

interface StatsOverviewProps {
  stats: UserStatsData;
  useMetric: boolean;
}

export function StatsOverview({ stats, useMetric }: StatsOverviewProps) {
  const formatVolume = (volume: number) => {
    const unit = useMetric ? 'kg' : 'lbs';
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M ${unit}`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K ${unit}`;
    }
    return `${volume.toFixed(0)} ${unit}`;
  };

  const formatHours = (hours: number) => {
    if (hours >= 1000) {
      return `${(hours / 1000).toFixed(1)}K hrs`;
    }
    return `${hours.toFixed(1)} hrs`;
  };

  const statCards = [
    {
      title: 'Total Workouts',
      value: stats.totalWorkouts.toLocaleString(),
      icon: TrophyIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Current Streak',
      value: `${stats.currentStreak} days`,
      icon: FireIcon,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Training Time',
      value: formatHours(stats.totalTrainingHours),
      icon: ClockIcon,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Total Volume',
      value: formatVolume(stats.totalVolume),
      icon: ScaleIcon,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Total Sets',
      value: stats.totalSets.toLocaleString(),
      icon: BoltIcon,
      color: 'from-yellow-500 to-amber-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      title: 'Active Weeks',
      value: stats.activeWeeks.toString(),
      icon: CalendarDaysIcon,
      color: 'from-cyan-500 to-teal-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <div className={`h-2 bg-gradient-to-r ${stat.color}`}></div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-8 h-8 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
