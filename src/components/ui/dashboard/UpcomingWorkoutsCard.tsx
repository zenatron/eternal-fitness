import { CalendarIcon, PlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { DashboardCard } from './DashboardCard';
import { UpcomingWorkout } from '@/types/dashboard';
import Link from 'next/link';

// Status badge colors
const statusColors = {
  today: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  tomorrow: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  upcoming: 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300'
};

// Status labels
const statusLabels: Record<UpcomingWorkout['status'], string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  upcoming: 'Upcoming'
};

interface UpcomingWorkoutsCardProps {
  workouts: UpcomingWorkout[];
}

export function UpcomingWorkoutsCard({ workouts }: UpcomingWorkoutsCardProps) {
  return (
    <DashboardCard
      title="Upcoming Workouts"
      icon={<CalendarIcon className="h-6 w-6" />}
      color="amber"
    >
      <div className="space-y-4">
        {workouts.map((workout) => (
          <div key={workout.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-heading">{workout.title}</h3>
                <p className="text-sm text-secondary mt-1">
                  {workout.exercises} exercises • {workout.duration} mins
                </p>
              </div>
              <span className={`${statusColors[workout.status]} text-xs px-2 py-1 rounded-full`}>
                {statusLabels[workout.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {workouts.length === 0 && (
        <div className="text-center py-6">
          <p className="text-secondary">No upcoming workouts</p>
        </div>
      )}
      
      <div className="flex flex-col gap-3 mt-4">
        <Link 
          href="/workout/create" 
          className="btn btn-primary w-full inline-flex items-center justify-center"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Schedule Workout
        </Link>
        
        <Link 
          href="/workouts" 
          className="btn btn-secondary w-full inline-flex items-center justify-center"
        >
          <ArrowRightIcon className="h-5 w-5 mr-1" />
          View All Workouts
        </Link>
      </div>
    </DashboardCard>
  );
} 