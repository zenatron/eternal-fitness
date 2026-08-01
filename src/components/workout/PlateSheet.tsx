'use client';

import { useMemo } from 'react';
import { ModalShell } from '@/components/ui/ModalShell';
import { ScaleIcon } from '@heroicons/react/24/outline';
import {
  BAR_OPTIONS,
  barWeight,
  calculatePlates,
  findBar,
  plateSet,
  type PlateLoading,
} from '@/utils/plates';

/**
 * Plate loading for a target weight.
 *
 * The number that matters is "what goes on each side", so that is what leads.
 * The visual below it exists because a stack of plates is faster to check
 * against a real bar than a list of numbers is — you compare shapes, not read.
 */

/**
 * Relative heights, so a 25 reads as bigger than a 1.25 at a glance. Keyed by
 * kg and lb denominations together; the two never appear at once.
 */
const PLATE_HEIGHT: Record<number, string> = {
  45: 'h-16',
  35: 'h-14',
  25: 'h-16',
  20: 'h-14',
  15: 'h-12',
  10: 'h-10',
  5: 'h-8',
  2.5: 'h-6',
  1.25: 'h-5',
};

function plateHeight(plate: number): string {
  return PLATE_HEIGHT[plate] ?? 'h-8';
}

function PlateStack({ loading }: { loading: PlateLoading }) {
  const plates = loading.perSide.flatMap(({ plate, count }) =>
    Array.from({ length: count }, (_, i) => ({ plate, key: `${plate}-${i}` }))
  );

  return (
    <div className="flex items-center justify-center gap-[3px] rounded-xl bg-surface-950 p-4 dark:bg-surface-200/40">
      {/* Sleeve, drawn only so the plates have something to sit against. */}
      <div className="h-3 w-6 shrink-0 rounded-l bg-surface-700 dark:bg-surface-500" aria-hidden="true" />
      {plates.length === 0 ? (
        <span className="px-3 text-sm text-surface-500 dark:text-surface-600">Empty bar</span>
      ) : (
        plates.map(({ plate, key }) => (
          <div
            key={key}
            className={`flex w-7 shrink-0 items-center justify-center rounded-sm bg-accent-500 text-[10px] font-bold tabular text-white shadow-sm ${plateHeight(
              plate
            )}`}
          >
            {plate}
          </div>
        ))
      )}
      <div className="h-3 w-3 shrink-0 rounded-r bg-surface-700 dark:bg-surface-500" aria-hidden="true" />
    </div>
  );
}

interface PlateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Target weight in the user's unit. */
  target: number;
  useMetric: boolean;
  barId: string;
  onBarChange: (barId: string) => void;
  exerciseName: string;
}

export function PlateSheet({
  isOpen,
  onClose,
  target,
  useMetric,
  barId,
  onBarChange,
  exerciseName,
}: PlateSheetProps) {
  const unit = useMetric ? 'kg' : 'lb';
  const bar = findBar(barId);

  const loading = useMemo(
    () => calculatePlates(target, barWeight(bar, useMetric), plateSet(useMetric)),
    [target, bar, useMetric]
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Plate Loading"
      subtitle={`${exerciseName} · ${target}${unit}`}
      maxWidth="max-w-md"
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-500/25 bg-accent-500/10">
          <ScaleIcon className="h-5 w-5 text-accent-500" />
        </div>
      }
    >
      <div className="text-center">
        <p className="font-display text-xs uppercase tracking-[0.2em] text-surface-500 dark:text-surface-600">
          Per side
        </p>
        <p className="mt-1 font-display text-3xl font-black tabular text-surface-50 dark:text-white">
          {loading.perSide.length > 0
            ? loading.perSide
                .flatMap(({ plate, count }) => Array.from({ length: count }, () => plate))
                .join(' + ')
            : '—'}
        </p>
      </div>

      <div className="mt-4">
        <PlateStack loading={loading} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Bar', value: `${barWeight(bar, useMetric)}${unit}` },
          {
            label: 'Per side',
            value: `${loading.perSide.reduce((s, p) => s + p.plate * p.count, 0)}${unit}`,
          },
          { label: 'Total', value: `${loading.achieved}${unit}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-surface-950 px-2 py-2 dark:bg-surface-200/40">
            <dd className="font-display text-base font-bold tabular text-surface-50 dark:text-white">
              {stat.value}
            </dd>
            <dt className="mt-0.5 text-[10px] uppercase tracking-wider text-surface-500 dark:text-surface-600">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>

      {/* The case worth surfacing loudly: the target simply cannot be built. */}
      {loading.belowBar ? (
        <p className="mt-3 rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">
          {target}
          {unit} is lighter than this bar on its own.
        </p>
      ) : (
        !loading.exact && (
          <p className="mt-3 rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">
            Closest loadable is {loading.achieved}
            {unit} — {Math.abs(loading.delta)}
            {unit} under. No combination of available plates hits {target}
            {unit} exactly.
          </p>
        )
      )}

      <fieldset className="mt-5">
        <legend className="form-label">Bar</legend>
        <div className="flex flex-wrap gap-2">
          {BAR_OPTIONS.map((option) => {
            const active = option.id === barId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onBarChange(option.id)}
                aria-pressed={active}
                className={`tap-control rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-accent-500 bg-accent-500/10 text-accent-700 dark:text-accent-300'
                    : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-400 dark:text-surface-800'
                }`}
              >
                {option.name}
                <span className="ml-1.5 tabular text-surface-500 dark:text-surface-600">
                  {barWeight(option, useMetric)}
                  {unit}
                </span>
              </button>
            );
          })}
        </div>
        <p className="form-hint">Remembered per exercise, on this device.</p>
      </fieldset>
    </ModalShell>
  );
}
