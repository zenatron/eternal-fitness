'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ClockIcon, ScaleIcon, BoltIcon } from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatVolume } from '@/utils/formatters';
import { formatDurationCompact } from '@/utils/durationUtils';
import { springSnappy, springGentle } from '@/lib/motion';

interface RecentActivityProps {
  stats: UserStatsData;
  useMetric: boolean;
  onViewAll?: () => void;
}


export function RecentActivity({ stats, useMetric, onViewAll }: RecentActivityProps) {
  const prefersReducedMotion = useReducedMotion();
  const noMotion = prefersReducedMotion ?? false;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = nowOnly.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

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
      <motion.div
        initial={noMotion ? {} : { opacity: 0, y: 20 }}
        animate={noMotion ? {} : { opacity: 1, y: 0 }}
        transition={springGentle}
        className="forge-card p-8"
      >
        <h3 className="text-xl font-display font-bold tracking-wide text-surface-50 dark:text-white mb-6 flex items-center gap-3">
          <ClockIcon className="w-6 h-6 text-info-500" />
          Recent Activity
        </h3>
        <div className="text-center py-8">
          <ClockIcon className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-500 dark:text-surface-600">
            No recent workouts found. Start your fitness journey today!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={noMotion ? {} : { opacity: 0, y: 20 }}
      animate={noMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="forge-card p-6"
    >
      <h3 className="text-xl font-display font-bold tracking-wide text-surface-50 dark:text-white mb-6 flex items-center gap-3">
        <ClockIcon className="w-6 h-6 text-info-500" />
        Recent Activity
      </h3>
      <div className="space-y-4">
        {stats.recentSessions.slice(0, 4).map((session, index) => (
          <motion.div
            key={session.id}
            initial={noMotion ? {} : { opacity: 0, x: -16 }}
            animate={noMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ ...springSnappy, delay: noMotion ? 0 : index * 0.07 }}
            className="flex items-center justify-between p-4 bg-surface-950 dark:bg-surface-200/50 rounded-xl hover:bg-surface-900 dark:hover:bg-surface-200 transition-colors"
          >
            <div className="flex-1">
              <h4 className="font-display font-bold text-surface-50 dark:text-white mb-1">
                {session.templateName}
              </h4>
              <p className="text-sm text-surface-500 dark:text-surface-600">
                {formatDateTime(session.completedAt)}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-accent-600 dark:text-accent-400">
                <ClockIcon className="w-4 h-4" />
                <span>{formatDurationCompact(session.duration)}</span>
              </div>
              <div className="flex items-center gap-1 text-accent-600 dark:text-accent-400">
                <ScaleIcon className="w-4 h-4" />
                <span>{formatVolume(session.totalVolume, useMetric)}</span>
              </div>
              <div className="flex items-center gap-1 text-success-600 dark:text-success-400">
                <BoltIcon className="w-4 h-4" />
                <span>{session.totalSets} sets</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {stats.recentSessions.length > 0 && onViewAll && (
        <motion.div
          className="mt-4 text-center"
          whileHover={noMotion ? {} : { scale: 1.03 }}
          whileTap={noMotion ? {} : { scale: 0.97 }}
          transition={springSnappy}
        >
          <button
            onClick={onViewAll}
            className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium text-sm inline-flex items-center gap-1 transition-colors"
          >
            View All Activity ({stats.recentSessions.length})
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
