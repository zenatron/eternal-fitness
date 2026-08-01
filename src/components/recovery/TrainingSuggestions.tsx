'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { PlayCircleIcon } from '@heroicons/react/24/outline';
import { useTemplates } from '@/lib/hooks/useTemplates';
import type { RecoveryMap } from '@/utils/recovery';
import {
  rankTemplates,
  READINESS_LABELS,
  formatRegionList,
  type PlannedExercise,
  type ReadinessStatus,
} from '@/utils/trainingSuggestions';
import type { WorkoutTemplate } from '@/types/workout';

/**
 * Which of your workouts suits the state you are actually in.
 *
 * The recovery map answers "what is tired"; this answers "so what should I do
 * today", which is the question that actually gets someone into the gym. It
 * ranks the user's own templates rather than inventing sessions — a suggestion
 * you cannot act on with one tap is not a suggestion.
 */

const STATUS_STYLES: Record<ReadinessStatus, string> = {
  ideal: 'bg-success-500/15 text-success-700 dark:text-success-400',
  good: 'bg-success-500/10 text-success-700 dark:text-success-400',
  caution: 'bg-warning-500/15 text-warning-700 dark:text-warning-400',
  avoid: 'bg-danger-500/15 text-danger-700 dark:text-danger-400',
};

/** Templates shown. Enough to offer a real choice, not a second template list. */
const SHOWN = 3;

export function TrainingSuggestions({ recovery }: { recovery: RecoveryMap }) {
  const { data: templates, isLoading } = useTemplates();

  const ranked = useMemo(() => {
    if (!templates?.length) return [];
    return rankTemplates(
      templates,
      (t: WorkoutTemplate) =>
        (t.workoutData?.exercises ?? []) as unknown as PlannedExercise[],
      recovery
    )
      .filter((r) => !r.readiness.empty)
      .slice(0, SHOWN);
  }, [templates, recovery]);

  if (isLoading) {
    return <div className="forge-card h-40 animate-pulse" />;
  }

  if (ranked.length === 0) {
    return (
      <div className="forge-card p-4 sm:p-5">
        <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-surface-50 dark:text-white">
          Train today
        </h2>
        <p className="text-sm text-surface-500 dark:text-surface-600">
          Once you have a workout template, the best match for how recovered you are will show up
          here.{' '}
          <Link href="/template/create" className="text-accent-600 dark:text-accent-400">
            Create one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="forge-card p-4 sm:p-5">
      <h2 className="mb-1 font-display text-sm font-bold uppercase tracking-wider text-surface-50 dark:text-white">
        Train today
      </h2>
      <p className="mb-3 text-xs text-surface-500 dark:text-surface-600">
        Your workouts, ranked against how recovered you are right now.
      </p>

      <ul className="space-y-2">
        {ranked.map(({ template, readiness }) => (
          <li key={template.id}>
            <Link
              href={`/template/${template.id}`}
              className="tap-control flex items-center gap-3 rounded-xl border border-surface-200 p-3 transition-colors hover:border-accent-500/40 dark:border-surface-400/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-display text-sm font-bold text-surface-50 dark:text-white">
                    {template.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[readiness.status]}`}
                  >
                    {READINESS_LABELS[readiness.status]}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-600">
                  {/* Lead with the reason not to, when there is one — that is the
                      part worth reading. Otherwise say what it trains. */}
                  {readiness.conflicts.length > 0
                    ? `${formatRegionList(readiness.conflicts.map((c) => c.label))} still recovering`
                    : readiness.primary
                        .slice(0, 3)
                        .map((p) => p.label)
                        .join(' · ')}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="font-display text-base font-bold tabular text-surface-50 dark:text-white">
                  {Math.round(readiness.score * 100)}%
                </span>
                <PlayCircleIcon className="ml-auto mt-0.5 h-4 w-4 text-accent-500" aria-hidden="true" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
