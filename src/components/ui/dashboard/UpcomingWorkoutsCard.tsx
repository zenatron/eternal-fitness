import { CalendarIcon, PlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { DashboardCard } from './DashboardCard';
import Link from 'next/link';
import { WorkoutTemplate } from '@/types/workout';

const statusColors = {
  today: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  tomorrow: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  upcoming: 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300'
};

interface UpcomingWorkoutsCardProps {
  templates: WorkoutTemplate[] | undefined;
}

export function UpcomingWorkoutsCard({ templates }: UpcomingWorkoutsCardProps) {
  return (
    <DashboardCard
      title="Upcoming Workouts"
      icon={<CalendarIcon className="h-6 w-6" />}
      color="amber"
    >
      <div className="space-y-4">
        {Array.isArray(templates) && templates.map((template) => (
          <div key={template.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-heading">{template.name}</h3>
                <p className="text-sm text-secondary mt-1">
                  {template.sets?.length} sets
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {(!Array.isArray(templates) || templates.length === 0) && (
        <div className="text-center py-6">
          <p className="text-secondary">No upcoming workouts scheduled.</p>
        </div>
      )}
      
      <div className="flex flex-col gap-3 mt-4">
        <Link 
          href="/template/create" 
          className="btn btn-primary w-full inline-flex items-center justify-center"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Create Template
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