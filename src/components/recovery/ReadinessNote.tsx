'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useRecovery } from '@/lib/hooks/useRecovery';
import { scoreTemplate, formatRegionList, type PlannedExercise } from '@/utils/trainingSuggestions';

/**
 * A heads-up on the template page when the session about to be started lands on
 * muscles that have not recovered.
 *
 * Deliberately only shown when there is something to say. A badge confirming
 * that everything is fine on every visit is noise, and noise is what makes
 * people stop reading the times it matters.
 *
 * It also never blocks anything: the model cannot see sleep, food or how you
 * actually feel, so this is information next to the button, not a gate in front
 * of it.
 */
export function ReadinessNote({ exercises }: { exercises: readonly PlannedExercise[] }) {
  const { recovery } = useRecovery();

  const readiness = useMemo(
    () => (recovery ? scoreTemplate(exercises, recovery) : null),
    [recovery, exercises]
  );

  if (!readiness || readiness.empty || readiness.conflicts.length === 0) return null;

  const names = readiness.conflicts.map((c) => c.label);
  const list = formatRegionList(names);

  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl bg-warning-500/15 px-3 py-2 text-left">
      <ExclamationTriangleIcon
        className="mt-0.5 h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400"
        aria-hidden="true"
      />
      <p className="text-xs text-warning-800 dark:text-warning-300">
        {list} {names.length === 1 ? 'is' : 'are'} still recovering from recent training.{' '}
        <Link href="/recovery" className="underline underline-offset-2">
          See your recovery map
        </Link>
        .
      </p>
    </div>
  );
}
