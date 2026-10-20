'use client';

import Link from 'next/link';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { formatVolume, formatWeight } from '@/utils/formatters';
import { DashboardCard } from '@/components/ui/dashboard/DashboardCard';

interface TopExercisesProps {
  stats: UserStatsData;
  useMetric: boolean;
  onViewAll?: () => void;
}

/** Most-trained lifts by volume, each linking to its own history. */
export function TopExercises({ stats, useMetric, onViewAll }: TopExercisesProps) {
  const exercises = (stats.topExercises ?? []).slice(0, 5);
  const maxVolume = Math.max(1, ...exercises.map((ex) => ex.totalVolume));

  return (
    <DashboardCard
      title="Top exercises"
      action={(stats.topExercises?.length ?? 0) > 5 && onViewAll ? { onClick: onViewAll, label: 'All' } : undefined}
    >
      {exercises.length === 0 ? (
        <p className="py-4 text-sm text-surface-500 dark:text-surface-600">
          Your most-trained lifts show up after a few sessions.
        </p>
      ) : (
        <ol className="space-y-3">
          {exercises.map((exercise) => (
            <li key={exercise.exerciseKey}>
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/exercise/${encodeURIComponent(exercise.exerciseKey)}`}
                  className="truncate text-sm font-medium text-surface-50 hover:text-accent-600 dark:text-white dark:hover:text-accent-400"
                >
                  {exercise.name}
                </Link>
                <span className="shrink-0 text-xs text-surface-500 dark:text-surface-600 tabular">
                  {exercise.sessionCount}× · best {formatWeight(exercise.maxWeight, useMetric)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
                  <span
                    className="block h-full rounded-full bg-accent-500"
                    style={{ width: `${(exercise.totalVolume / maxVolume) * 100}%` }}
                  />
                </span>
                <span className="w-[4.75rem] shrink-0 whitespace-nowrap text-right text-xs text-surface-300 dark:text-surface-800 tabular">
                  {formatVolume(exercise.totalVolume, useMetric)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}
