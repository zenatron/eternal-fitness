'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { TrophyIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatPRValue, prTypeFromApi } from '@/utils/prFormatting';
import { springSnappy, springBouncy, springGentle } from '@/lib/motion';

interface PersonalRecordsProps {
  stats: UserStatsData;
  useMetric: boolean;
  onViewAll?: () => void;
}


export function PersonalRecords({ stats, useMetric, onViewAll }: PersonalRecordsProps) {
  const prefersReducedMotion = useReducedMotion();
  const noMotion = prefersReducedMotion ?? false;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!stats.personalRecords || stats.personalRecords.length === 0) {
    return (
      <motion.div
        initial={noMotion ? {} : { opacity: 0, y: 20 }}
        animate={noMotion ? {} : { opacity: 1, y: 0 }}
        transition={springGentle}
        className="forge-card p-8"
      >
        <h3 className="text-xl font-display font-bold tracking-wide text-surface-50 dark:text-white mb-6 flex items-center gap-2">
          <TrophyIcon className="w-6 h-6 text-award-500" />
          Personal Records
        </h3>
        <div className="text-center py-8">
          <TrophyIcon className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-500 dark:text-surface-600">
            No personal records yet. Keep training to set your first PR!
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
      <motion.h3
        className="text-xl font-display font-bold tracking-wide text-surface-50 dark:text-white mb-6 flex items-center gap-2"
        initial={noMotion ? {} : { scale: 0 }}
        animate={noMotion ? {} : { scale: 1 }}
        transition={{ ...springBouncy, delay: noMotion ? 0 : 0.2 }}
      >
        <motion.span
          animate={noMotion ? {} : {
            scale: [1, 1.3, 1],
            rotate: [0, -10, 10, -5, 0],
          }}
          transition={{ duration: 0.6, delay: noMotion ? 0 : 0.4, ease: 'easeInOut' }}
        >
          <TrophyIcon className="w-6 h-6 text-award-500" />
        </motion.span>
        Personal Records
      </motion.h3>
      <div className="space-y-3">
        {stats.personalRecords.slice(0, 4).map((record, index) => (
          <motion.div
            key={`${record.exerciseKey}_${record.type}`}
            initial={noMotion ? {} : { opacity: 0, x: -20, scale: 0.9 }}
            animate={noMotion ? {} : { opacity: 1, x: 0, scale: 1 }}
            transition={{ ...springBouncy, delay: noMotion ? 0 : index * 0.08 }}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-award-50 to-award-100 dark:from-award-900/20 dark:to-award-900/20 rounded-xl border border-award-200 dark:border-award-800"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-award-100 dark:bg-award-900/30 rounded-lg">
                <ScaleIcon className="w-5 h-5 text-award-600 dark:text-award-400" />
              </div>
              <div>
                <Link
                  href={`/exercise/${encodeURIComponent(record.exerciseName)}`}
                  className="font-display font-bold text-surface-50 hover:text-accent-600 dark:text-white dark:hover:text-accent-400"
                >
                  {record.exerciseName}
                </Link>
                <p className="text-sm text-surface-500 dark:text-surface-600">
                  {record.type === 'weight' ? 'Max Weight' : 
                   record.type === 'volume' ? 'Max Volume' :
                   record.type === 'duration' ? 'Max Duration' : 'Max Distance'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-display font-bold text-award-600 dark:text-award-400">
                {formatPRValue(record.value, prTypeFromApi(record.type), useMetric)}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-600">
                {formatDate(record.achievedAt)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      {stats.personalRecords.length > 4 && (
        <motion.div
          className="mt-4 text-center"
          whileHover={noMotion ? {} : { scale: 1.03 }}
          whileTap={noMotion ? {} : { scale: 0.97 }}
          transition={springSnappy}
        >
          <Link
            href="/personal-records"
            className="text-award-600 dark:text-award-400 hover:text-award-700 dark:hover:text-award-300 font-medium text-sm inline-flex items-center gap-1 transition-colors"
          >
            View All Records ({stats.personalRecords.length})
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
