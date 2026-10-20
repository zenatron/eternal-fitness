import { ActivityDay } from '@/types/dashboard';
import { DashboardCard } from './DashboardCard';

interface StreakCardProps {
  streak: number;
  activityData: ActivityDay[];
}

/**
 * Streak plus the last four weeks as a training calendar.
 *
 * The count is stated once, at a size that reads at a glance, beside the
 * figure that gives it context (days trained of the last 28). It used to be a
 * 48px number centred alone in the card under a wobbling flame icon.
 */
export function StreakCard({ streak, activityData }: StreakCardProps) {
  const days = activityData.slice(-28);
  const trained = days.filter((d) => d.completed).length;

  return (
    <DashboardCard title="Streak" className="h-full">
      <div className="mb-4 flex items-end justify-between gap-4">
        <p>
          <span className="stat-value text-4xl">{streak}</span>
          <span className="ml-1.5 text-sm text-surface-500 dark:text-surface-600">
            {streak === 1 ? 'day' : 'days'}
          </span>
        </p>
        <p className="text-right text-xs text-surface-500 dark:text-surface-600">
          <span className="font-semibold text-surface-50 dark:text-white tabular">{trained}</span> of{' '}
          {days.length} days trained
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1" role="list" aria-label="Training in the last four weeks">
        {days.map((day) => (
          <div
            key={day.date}
            role="listitem"
            // The inactive swatch must be light in light mode: on the inverted
            // surface scale `surface-200` is near-black.
            className={`aspect-square max-h-7 w-full rounded-[4px] ${
              day.completed ? 'bg-accent-500' : 'bg-black/[0.06] dark:bg-white/[0.06]'
            }`}
            title={day.date}
            aria-label={`${day.date}: ${day.completed ? 'trained' : 'rest day'}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-surface-500 dark:text-surface-600">
        <span>4 weeks ago</span>
        <span>Today</span>
      </div>
    </DashboardCard>
  );
}
