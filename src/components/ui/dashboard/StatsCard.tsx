import {
  UserIcon,
  TrophyIcon,
  ClockIcon,
  ScaleIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { StatsData } from '@/types/dashboard';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatVolume } from '@/utils/formatters';

interface StatsCardProps {
  data: StatsData;
}

export function StatsCard({ data }: StatsCardProps) {

  const statCards = [
    {
      title: 'Total Workouts',
      value: data.totalWorkouts.toLocaleString(),
      icon: TrophyIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Training Time',
      value: `${data.hoursTrained.toFixed(1)} hrs`,
      icon: ClockIcon,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Total Volume',
      value: formatVolume(data.totalVolume.amount, data.totalVolume.unit === 'kg'),
      icon: ScaleIcon,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Active Weeks',
      value: data.activeWeeks.toString(),
      icon: CalendarDaysIcon,
      color: 'from-cyan-500 to-teal-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      <div className="h-2 bg-gradient-to-r from-cyan-500 to-teal-500"></div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Stats</h2>
          <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20">
            <UserIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Volume Progress Bar */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Volume Progress</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">vs last month</p>
            </div>
            <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
              +{data.totalVolume.percentIncrease}%
            </p>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(data.totalVolume.percentIncrease * 2, 100)}%` }}
            ></div>
          </div>
        </div>

        <Link
          href="/profile"
          className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
        >
          <TrophyIcon className="w-4 h-4" />
          View Full Stats
        </Link>
      </div>
    </motion.div>
  );
}
