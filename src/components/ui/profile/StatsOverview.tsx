'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  TrophyIcon,
  FireIcon,
  ClockIcon,
  ScaleIcon,
  CalendarDaysIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatVolume } from '@/utils/formatters';
import { springBouncy } from '@/lib/motion';

interface StatsOverviewProps {
  stats: UserStatsData;
  useMetric: boolean;
}


export function StatsOverview({ stats, useMetric }: StatsOverviewProps) {
  const prefersReducedMotion = useReducedMotion();
  const noMotion = prefersReducedMotion ?? false;

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
      color: 'from-accent-500 to-info-600',
      bgColor: 'bg-accent-50 dark:bg-accent-900/20',
      iconColor: 'text-accent-600 dark:text-accent-400',
    },
    {
      title: 'Current Streak',
      value: `${stats.currentStreak} days`,
      icon: FireIcon,
      color: 'from-accent-500 to-accent-600',
      bgColor: 'bg-accent-50 dark:bg-accent-900/20',
      iconColor: 'text-accent-600 dark:text-accent-400',
    },
    {
      title: 'Training Time',
      value: formatHours(stats.totalTrainingHours),
      icon: ClockIcon,
      color: 'from-success-500 to-success-500',
      bgColor: 'bg-success-50 dark:bg-success-900/20',
      iconColor: 'text-success-600 dark:text-success-400',
    },
    {
      title: 'Total Volume',
      value: formatVolume(stats.totalVolume, useMetric),
      icon: ScaleIcon,
      color: 'from-info-500 to-info-600',
      bgColor: 'bg-accent-50 dark:bg-accent-900/20',
      iconColor: 'text-accent-600 dark:text-accent-400',
    },
    {
      title: 'Total Sets',
      value: stats.totalSets.toLocaleString(),
      icon: BoltIcon,
      color: 'from-award-400 to-award-600',
      bgColor: 'bg-award-50 dark:bg-award-900/20',
      iconColor: 'text-award-600 dark:text-award-400',
    },
    {
      title: 'Active Weeks',
      value: stats.activeWeeks.toString(),
      icon: CalendarDaysIcon,
      color: 'from-info-500 to-info-500',
      bgColor: 'bg-info-50 dark:bg-info-900/20',
      iconColor: 'text-info-600 dark:text-info-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statCards.map((stat, index) => (
        <motion.div
          key={index}
          initial={noMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
          animate={noMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springBouncy, delay: noMotion ? 0 : index * 0.05 }}
          whileHover={noMotion ? {} : { y: -3, scale: 1.02 }}
          className="forge-card overflow-hidden"
        >
          <motion.div
            className={`h-2 bg-gradient-to-r ${stat.color}`}
            animate={noMotion ? {} : {
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            style={{ backgroundSize: '200% 200%' }}
          />
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-500 dark:text-surface-600 mb-1">
                  {stat.title}
                </p>
                <p className="text-3xl font-display font-bold tracking-wide text-surface-50 dark:text-white">
                  {stat.value}
                </p>
              </div>
              <motion.div
                className={`p-3 rounded-xl ${stat.bgColor}`}
                animate={noMotion ? {} : {
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }}
              >
                <stat.icon className={`w-8 h-8 ${stat.iconColor}`} />
              </motion.div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
