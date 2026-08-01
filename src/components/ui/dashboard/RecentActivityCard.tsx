import { ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { ActivityEntry } from '@/types/dashboard';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { formatTimeAgo } from '@/utils/relativeTime';
import { useNow } from '@/lib/hooks/useNow';

interface RecentActivityCardProps {
  activities: ActivityEntry[];
}

export function RecentActivityCard({ activities }: RecentActivityCardProps) {
  const prefersReducedMotion = useReducedMotion();
  // Ages the labels while the page stays open; the payload only carries the
  // timestamp, so nothing here can go stale in the query cache.
  const now = useNow();

  return (
    <div className="forge-card heat-glow h-full">
      <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-300 flex items-center justify-between">
        <h3 className="font-display font-bold text-surface-50 dark:text-white tracking-wide uppercase text-sm">
          Recent Activity
        </h3>
        <ClockIcon className="w-5 h-5 text-accent-500/40" />
      </div>
      <div className="p-5">
        {activities.length === 0 ? (
          <p className="text-sm text-surface-500 dark:text-surface-600 text-center py-6">
            No recent activity yet. Start your first workout!
          </p>
        ) : (
          <div className="space-y-2">
            {activities.map((activity, i) => {
              const timeAgo = formatTimeAgo(activity.completedAt, now ?? Date.now());
              return (
              <motion.div
                key={activity.id}
                initial={
                  prefersReducedMotion
                    ? {}
                    : { opacity: 0, x: -12 }
                }
                whileInView={
                  prefersReducedMotion
                    ? {}
                    : { opacity: 1, x: 0 }
                }
                viewport={{ once: true }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  delay: i * 0.05,
                }}
                className="flex items-center justify-between py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-surface-50 dark:text-white truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-600 truncate">
                    Completed {timeAgo} &middot; {activity.volumeLabel}
                  </p>
                </div>
                <span className="text-xs text-surface-400 dark:text-surface-600 ml-3 shrink-0 tabular">
                  {timeAgo}
                </span>
              </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          whileHover={
            prefersReducedMotion ? {} : { x: 2 }
          }
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Link
            href="/profile?modal=activity"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-display font-semibold tracking-wide uppercase text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors"
          >
            View All
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
