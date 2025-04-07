import { ChartBarIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { DashboardCard } from './DashboardCard';
import { ProgressData } from '@/types/dashboard';

interface ProgressCardProps {
  data: ProgressData;
}

export function ProgressCard({ data }: ProgressCardProps) {
  return (
    <DashboardCard
      title="Progress"
      icon={<ChartBarIcon className="h-6 w-6" />}
      color="green"
    >
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-heading">{data.workoutsCompleted}</p>
          <p className="text-secondary text-sm">sessions completed</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-heading">{data.personalRecords}</p>
          <p className="text-secondary text-sm">personal records</p>
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-secondary">Weight Progress</p>
          <p className="text-sm font-medium text-heading flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
            {data.weightProgress.current}{data.weightProgress.unit}
          </p>
        </div>
        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" 
            style={{ width: `${data.weightProgress.percentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-secondary mt-1">
          {data.weightProgress.percentage}% to goal ({data.weightProgress.goal}{data.weightProgress.unit})
        </p>
      </div>
    </DashboardCard>
  );
} 