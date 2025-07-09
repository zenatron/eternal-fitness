import {
  CalendarIcon,
  PlusIcon,
  ArrowRightIcon,
  ClockIcon,
  CalendarDaysIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { WorkoutSession } from '@/types/workout';
import { formatUTCDateToLocalDateFriendly } from '@/utils/dateUtils';
import { useTemplate } from '@/lib/hooks/useTemplate';
import { useProfile } from '@/lib/hooks/useProfile';
import { formatVolume } from '@/utils/formatters';
import { motion } from 'framer-motion';

const statusColors = {
  today: 'bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700',
  tomorrow: 'bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700',
  upcoming: 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700/50 dark:to-gray-600/50 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600',
};

interface SessionDisplayItemProps {
  session: WorkoutSession;
  useMetric: boolean | undefined;
  getStatusStyle: (date: Date | string) => string;
}

// Sub-component to display a single session, ensuring hooks are called correctly
function SessionDisplayItem({
  session,
  useMetric,
  getStatusStyle,
}: SessionDisplayItemProps) {
  // Call hooks at the top level of the component
  const { template, isLoading, error } = useTemplate(session.workoutTemplateId);

  // Handle loading/error states for the template fetch
  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/50 rounded-xl p-4 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
        <p className="text-sm font-medium">
          Error loading template details
        </p>
        <p className="text-xs opacity-75">Template ID: {session.workoutTemplateId}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {template?.name || 'Untitled Template'}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {session.scheduledAt && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                  session.scheduledAt || '',
                )}`}
              >
                {formatUTCDateToLocalDateFriendly(session.scheduledAt)}
              </span>
            )}
            {session.duration && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg">
                <ClockIcon className="h-3 w-3" />
                {session.duration} min
              </div>
            )}
            {template?.totalVolume !== null &&
              template?.totalVolume !== undefined && (
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg">
                  <ScaleIcon className="h-3 w-3" />
                  {formatVolume(template.totalVolume, useMetric)}
                </div>
              )}
          </div>
        </div>
        <Link
          href={`/session/active/${session.workoutTemplateId}?sessionId=${session.id}`}
          className="ml-4 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
        >
          Start
        </Link>
      </div>
    </motion.div>
  );
}

interface UpcomingWorkoutsCardProps {
  sessions: WorkoutSession[] | undefined;
}

export function UpcomingWorkoutsCard({ sessions }: UpcomingWorkoutsCardProps) {
  const { profile } = useProfile();
  // Get today's date in YYYY-MM-DD format for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get tomorrow's date
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Helper to determine which style to use based on date
  const getStatusStyle = (scheduledDate: Date | string): string => {
    const date = new Date(scheduledDate);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return statusColors.today;
    if (date.getTime() === tomorrow.getTime()) return statusColors.tomorrow;
    return statusColors.upcoming;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
    >
      <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500"></div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upcoming Workouts</h2>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <CalendarDaysIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {Array.isArray(sessions) && sessions.length > 0 ? (
            sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <SessionDisplayItem
                  session={session}
                  useMetric={profile?.useMetric}
                  getStatusStyle={getStatusStyle}
                />
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No upcoming workouts scheduled
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Create a template and schedule your next session!
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/template/create"
            className="btn btn-secondary inline-flex items-center justify-center gap-2 text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            Create
          </Link>
          <Link
            href="/templates"
            className="btn btn-primary inline-flex items-center justify-center gap-2 text-sm"
          >
            <ArrowRightIcon className="h-4 w-4" />
            Browse
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
