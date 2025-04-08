import { CalendarIcon, PlusIcon, ArrowRightIcon, ClockIcon } from '@heroicons/react/24/outline';
import { DashboardCard } from './DashboardCard';
import Link from 'next/link';
import { WorkoutSession } from '@/types/workout';
import { formatUTCDateToLocalDateFriendly } from '@/utils/dateUtils';

const statusColors = {
  today: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  tomorrow: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  upcoming: 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300'
};

interface UpcomingWorkoutsCardProps {
  sessions: WorkoutSession[] | undefined;
}

export function UpcomingWorkoutsCard({ sessions }: UpcomingWorkoutsCardProps) {
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
      <div className="space-y-4">
        {Array.isArray(sessions) && sessions.length > 0 ? (
          sessions.map((session) => (
            <div key={session.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-heading">{session.workoutTemplate?.name || "Untitled Workout"}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span 
                      className={`text-xs px-2 py-1 rounded-full ${getStatusStyle(session.scheduledAt || '')}`}
                    >
                      {formatUTCDateToLocalDateFriendly(session.scheduledAt)}
                    </span>
                    {session.duration && (
                      <span className="text-xs flex items-center gap-1 text-secondary">
                        <ClockIcon className="h-3 w-3" />
                        {session.duration} min
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
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