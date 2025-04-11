import {
  CalendarIcon,
  PlusIcon,
  ArrowRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { DashboardCard } from './DashboardCard';
import Link from 'next/link';
import { WorkoutSession } from '@/types/workout';
import { formatUTCDateToLocalDateFriendly } from '@/utils/dateUtils';
import { useTemplate } from '@/lib/hooks/useTemplate';
import { useProfile } from '@/lib/hooks/useProfile';
import { formatVolume } from '@/utils/formatters';

const statusColors = {
  today: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  tomorrow:
    'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  upcoming: 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300',
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
      <div className="bg-red-50 dark:bg-red-900/50 rounded-xl p-4 text-red-700 dark:text-red-300">
        <p className="text-sm font-medium">
          Error loading template details for ID: {session.workoutTemplateId}
        </p>
        <p className="text-xs">({String(error)})</p>
      </div>
    );
  }

  return (
    <div
      key={session.id}
      className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-heading">
            {template?.name || 'Untitled Template'}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-secondary text-xs">
            {session.scheduledAt && (
              <span
                className={`px-2 py-0.5 rounded-full ${getStatusStyle(
                  session.scheduledAt || '',
                )}`}
              >
                {formatUTCDateToLocalDateFriendly(session.scheduledAt)}
              </span>
            )}
            {session.duration && (
              <span className="flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                {session.duration} min
              </span>
            )}
            {template?.totalVolume !== null &&
              template?.totalVolume !== undefined && (
                <span className="flex items-center gap-1">
                  {formatVolume(template.totalVolume, useMetric)}
                </span>
              )}
          </div>
        </div>
        {/* Optional: Add an action button, e.g., link to start session */}
        {/* <Link href={`/session/start/${session.id}`} className="btn btn-sm btn-secondary">Start</Link> */}
      </div>
    </div>
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
    <DashboardCard
      title="Upcoming Workouts"
      icon={<CalendarIcon className="h-6 w-6" />}
      color="amber"
    >
      <div className="space-y-3">
        {Array.isArray(sessions) && sessions.length > 0 ? (
          sessions.map((session) => (
            // Render the new sub-component for each session
            <SessionDisplayItem
              key={session.id}
              session={session}
              useMetric={profile?.useMetric}
              getStatusStyle={getStatusStyle}
            />
          ))
        ) : (
          <div className="text-center py-6">
            <p className="text-secondary">No upcoming workouts scheduled.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <Link
          href="/template/create"
          className="btn btn-quaternary w-full inline-flex items-center justify-center"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Schedule Workout
        </Link>

        <Link
          href="/templates"
          className="btn btn-secondary w-full inline-flex items-center justify-center"
        >
          <ArrowRightIcon className="h-5 w-5 mr-1" />
          View Templates
        </Link>
      </div>
    </DashboardCard>
  );
}
