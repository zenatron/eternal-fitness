import { TrophyIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';

interface PersonalRecordsProps {
  stats: UserStatsData;
  useMetric: boolean;
  onViewAll?: () => void;
}

export function PersonalRecords({ stats, useMetric, onViewAll }: PersonalRecordsProps) {
  const formatWeight = (weight: number) => {
    const unit = useMetric ? 'kg' : 'lbs';
    return `${weight.toFixed(1)} ${unit}`;
  };

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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <TrophyIcon className="w-6 h-6 text-yellow-500" />
          Personal Records
        </h3>
        <div className="text-center py-8">
          <TrophyIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No personal records yet. Keep training to set your first PR!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <TrophyIcon className="w-6 h-6 text-yellow-500" />
        Personal Records
      </h3>
      <div className="space-y-3">
        {stats.personalRecords.slice(0, 4).map((record, index) => (
          <div
            key={`${record.exerciseKey}_${record.type}`}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <ScaleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {record.exerciseName}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {record.type === 'weight' ? 'Max Weight' : 
                   record.type === 'reps' ? 'Max Reps' : 'Max Volume'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {record.type === 'weight' ? formatWeight(record.value) : 
                 record.type === 'reps' ? `${record.value} reps` :
                 formatWeight(record.value)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(record.achievedAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
      {stats.personalRecords.length > 4 && (
        <div className="mt-4 text-center">
          <button
            onClick={onViewAll}
            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 font-medium text-sm inline-flex items-center gap-1 transition-colors"
          >
            View All Records ({stats.personalRecords.length})
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
