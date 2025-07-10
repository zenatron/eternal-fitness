import { ClockIcon, ChartBarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { ActivityEntry } from '@/types/dashboard';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface RecentActivityCardProps {
  activities: ActivityEntry[];
}

export function RecentActivityCard({ activities }: RecentActivityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
    >
      <div className="h-2 bg-gradient-to-r from-purple-500 to-purple-600"></div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
            <ClockIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-8">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No recent activity. Start your first workout!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {activity.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activity.details}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {activity.timeAgo}
                  </p>
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 ml-auto"></div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <Link
          href="/profile?modal=activity"
          className="mt-6 w-full btn btn-secondary inline-flex items-center justify-center gap-2 group"
        >
          View All Activity
          <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}
