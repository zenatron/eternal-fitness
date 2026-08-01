'use client';

import { useState } from 'react';
import { ScaleIcon } from '@heroicons/react/24/outline';
import { PlateSheet } from './PlateSheet';
import { useBarPreference } from '@/lib/hooks/useBarPreference';
import { barWeight, calculatePlates, findBar, plateSet } from '@/utils/plates';
import { estimateOneRepMax, formatOneRepMax } from '@/utils/oneRepMax';
import { defaultBarForExercise } from '@/lib/exerciseLookup';

/**
 * The two numbers a lifter derives by hand between sets: what plates to load,
 * and whether that set was actually stronger than the last one.
 *
 * Rendered as a quiet strip under the inputs rather than as another card. It is
 * reference information — glanceable while racking, never competing with the
 * fields you are there to fill in.
 */

interface SetInsightsProps {
  exerciseKey: string;
  exerciseName: string;
  /** Barbell lifts get the plate chip; dumbbell and machine work does not. */
  isBarbell: boolean;
  weight: number | undefined;
  reps: number | undefined;
  useMetric: boolean;
}

export function SetInsights({
  exerciseKey,
  exerciseName,
  isBarbell,
  weight,
  reps,
  useMetric,
}: SetInsightsProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [barId, setBarId] = useBarPreference(exerciseKey, defaultBarForExercise(exerciseKey));

  const hasWeight = typeof weight === 'number' && weight > 0;
  const estimate = hasWeight && reps ? estimateOneRepMax(weight, reps) : null;

  const loading = hasWeight && isBarbell
    ? calculatePlates(weight, barWeight(findBar(barId), useMetric), plateSet(useMetric))
    : null;

  // Nothing worth saying yet — an empty strip would just be noise above the
  // notes field.
  if (!loading && estimate === null) return null;

  return (
    <>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {loading && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="tap-control inline-flex items-center gap-1.5 rounded-lg border border-surface-900 bg-surface-950 px-2.5 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:border-accent-500/50 dark:border-surface-400/50 dark:bg-surface-200/40 dark:text-surface-800"
            aria-label={`Plate loading for ${weight} ${useMetric ? 'kilograms' : 'pounds'}`}
          >
            <ScaleIcon className="h-3.5 w-3.5 shrink-0 text-accent-500" aria-hidden="true" />
            <span className="tabular">
              {loading.belowBar
                ? 'Under bar'
                : loading.perSide.length === 0
                  ? 'Empty bar'
                  : loading.perSide
                      .flatMap(({ plate, count }) =>
                        Array.from({ length: count }, () => plate)
                      )
                      .join(' + ')}
            </span>
            <span className="text-surface-500 dark:text-surface-600">/side</span>
            {/* An unreachable target is worth a mark here, not just inside the
                sheet — otherwise you only find out at the rack. */}
            {!loading.exact && !loading.belowBar && (
              <span className="text-warning-600 dark:text-warning-400" title="Not exactly loadable">
                ≉
              </span>
            )}
          </button>
        )}

        {estimate !== null && (
          <span
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-900 bg-surface-950 px-2.5 py-1.5 text-xs font-medium text-surface-600 dark:border-surface-400/50 dark:bg-surface-200/40 dark:text-surface-800"
            title={`Estimated one-rep max from ${reps} reps at ${weight}`}
          >
            <span className="font-display uppercase tracking-wider text-surface-500 dark:text-surface-600">
              e1RM
            </span>
            <span className="tabular font-bold text-surface-50 dark:text-white">
              {formatOneRepMax(estimate, useMetric)}
            </span>
          </span>
        )}
      </div>

      {loading && (
        <PlateSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          target={weight as number}
          useMetric={useMetric}
          barId={barId}
          onBarChange={setBarId}
          exerciseName={exerciseName}
        />
      )}
    </>
  );
}
