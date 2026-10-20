import Link from 'next/link';
import { ProgressData } from '@/types/dashboard';
import { DashboardCard } from './DashboardCard';

interface ProgressCardProps {
  data: ProgressData;
}

export function ProgressCard({ data }: ProgressCardProps) {
  const weight = data.weightProgress;
  const hasGoal = weight.goal > 0;

  return (
    <DashboardCard title="Progress" action={{ href: '/personal-records', label: 'Records' }} className="h-full">
      <dl className="grid grid-cols-2 divide-x divide-black/[0.06] dark:divide-white/[0.06]">
        <div className="pr-4">
          <dt className="stat-label">Workouts</dt>
          <dd className="stat-value mt-1.5">{data.workoutsCompleted}</dd>
        </div>
        <div className="pl-4">
          <dt className="stat-label">Records</dt>
          <dd className="stat-value mt-1.5">{data.personalRecords}</dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-surface-300 dark:text-surface-900">Body weight</span>
          <span className="text-sm font-semibold text-surface-50 dark:text-white tabular">
            {weight.current ? `${weight.current} ${weight.unit}` : '—'}
          </span>
        </div>
        {/* With no goal there is nothing to measure against; this used to draw
            an empty bar captioned "0% there — 0.0lbs to go". */}
        {!hasGoal ? (
          <Link
            href="/profile/edit"
            className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400"
          >
            Set a weight goal
          </Link>
        ) : (
          <>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]"
              role="progressbar"
              aria-valuenow={weight.percentage ?? undefined}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress toward weight goal"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                  weight.reached ? 'bg-success-500' : 'bg-accent-500'
                }`}
                style={{ width: `${weight.percentage ?? 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-600">
              {weight.reached ? (
                <>Goal of {weight.goal} {weight.unit} reached</>
              ) : weight.percentage === null ? (
                // No baseline recorded yet, so a percentage would be fabricated.
                <>
                  {weight.remaining.toFixed(1)} {weight.unit} to {weight.direction === 'lose' ? 'lose' : 'gain'} · goal{' '}
                  {weight.goal} {weight.unit}
                </>
              ) : (
                <>
                  {weight.percentage}% of the way · {weight.remaining.toFixed(1)} {weight.unit} to go
                </>
              )}
            </p>
          </>
        )}
      </div>
    </DashboardCard>
  );
}
