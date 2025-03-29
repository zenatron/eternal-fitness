import { FireIcon } from '@heroicons/react/24/outline';
import { DashboardCard } from './DashboardCard';
import { ActivityDay } from '@/types/dashboard';

interface StreakCardProps {
  streak: number;
  activityData: ActivityDay[];
}

export function StreakCard({ streak, activityData }: StreakCardProps) {
  return (
    <DashboardCard
      title="Current Streak"
      icon={<FireIcon className="h-6 w-6" />}
      color="blue"
    >
      <div className="flex items-center justify-center mb-4">
        <div className="text-center">
          <p className="text-5xl font-bold text-heading">{streak}</p>
          <p className="text-secondary mt-1">days</p>
        </div>
      </div>
      
      <div className="mt-6">
        <p className="text-sm text-secondary mb-2">Monthly Workout Calendar</p>
        <div className="grid grid-cols-7 gap-1">
          {activityData.slice(-28).map((day, index) => (
            <div 
              key={index} 
              className={`h-6 w-full rounded-sm ${
                day.completed 
                  ? 'bg-green-500/90 dark:bg-green-500/80' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
              title={`${day.date}: ${day.completed ? 'Completed' : 'Missed'}`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-secondary">4 weeks ago</span>
          <span className="text-xs text-secondary">Today</span>
        </div>
      </div>
    </DashboardCard>
  );
} 