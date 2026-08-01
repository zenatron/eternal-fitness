'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { BodyMap } from '@/components/recovery/BodyMap';
import { TrainingSuggestions } from '@/components/recovery/TrainingSuggestions';
import { useRecovery } from '@/lib/hooks/useRecovery';
import { ErrorState } from '@/components/ui/ErrorState';
import { REGION_META, type BodyRegion } from '@/lib/muscleRegions';
import {
  recoveryStatus,
  RECOVERY_STATUS_LABELS,
  freshestRegions,
  fatiguedRegions,
} from '@/utils/recovery';

const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

/**
 * Selecting a region from the lists as well as the diagram.
 *
 * The SVG shapes are aria-hidden — they are decorative geometry and a mirrored
 * pair cannot sensibly be one focusable control — so these are the accessible
 * route to the same state, and they switch the diagram to the view the region
 * is actually drawn on.
 */
function RegionButton({
  region,
  freshness,
  selected,
  onSelect,
  emphasis,
}: {
  region: BodyRegion;
  freshness: number;
  selected: boolean;
  onSelect: (region: BodyRegion) => void;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(region)}
      aria-pressed={selected}
      className={`tap-control flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
        selected
          ? 'bg-accent-500/10 ring-1 ring-accent-500/40'
          : 'hover:bg-surface-900 dark:hover:bg-surface-200'
      }`}
    >
      <span className="truncate text-sm text-surface-600 dark:text-surface-800">
        {REGION_META[region].label}
      </span>
      <span
        className={`shrink-0 tabular text-sm font-bold ${
          emphasis ? 'text-accent-600 dark:text-accent-400' : 'text-surface-50 dark:text-white'
        }`}
      >
        {Math.round(freshness * 100)}%
      </span>
    </button>
  );
}

function hoursLabel(hours: number | null): string {
  if (hours === null) return 'Not trained recently';
  if (hours < 1) return 'Trained just now';
  if (hours < 24) return `Trained ${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `Trained ${days} day${days === 1 ? '' : 's'} ago`;
}

export default function RecoveryPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { recovery, isLoading, error, refetch } = useRecovery();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selected, setSelected] = useState<BodyRegion | null>(null);

  if (isLoading) {
    return (
      <div className="app-bg px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-surface-900 dark:bg-surface-200" />
          <div className="h-96 animate-pulse rounded-xl bg-surface-900 dark:bg-surface-200" />
        </div>
      </div>
    );
  }

  if (error || !recovery) {
    return (
      <div className="app-bg px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <ErrorState what="your recovery map" onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  /* Selecting a region also flips to the view it is drawn on, so choosing
     "Hamstrings" from the list does not highlight something off-screen. */
  const selectRegion = (region: BodyRegion) => {
    setSelected((current) => (current === region ? null : region));
    const drawnOn = REGION_META[region].view;
    if (drawnOn !== 'both') setView(drawnOn);
  };

  const needsRest = fatiguedRegions(recovery);
  const readiest = freshestRegions(recovery, 4);
  const detail = selected ? recovery[selected] : null;

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={springGentle}
      className="app-bg px-4 py-8"
    >
      <div className="mx-auto max-w-3xl">
        <div className="forge-card mb-6 overflow-hidden">
          <div className="greeting-gradient px-5 py-5 text-white sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="touch-target tap-control flex shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Go back"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xs uppercase tracking-[0.2em] text-white/70">
                  Recovery
                </p>
                <h1 className="truncate font-display text-2xl font-bold tracking-wide sm:text-3xl">
                  Muscle Map
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className="forge-card mb-6 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-center gap-1.5">
            {(['front', 'back'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`tap-control min-h-[38px] rounded-lg px-4 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
                  view === v
                    ? 'bg-accent-500 text-white'
                    : 'bg-surface-900 text-surface-600 dark:bg-surface-200 dark:text-surface-800'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="mx-auto h-[380px] max-w-[240px] sm:h-[440px]">
            <BodyMap
              recovery={recovery}
              view={view}
              selected={selected}
              onSelect={selectRegion}
            />
          </div>

          {/* Tapping a region is not discoverable on its own, so the detail line
              doubles as the hint when nothing is selected. */}
          <div className="mt-3 min-h-[3.5rem] rounded-xl bg-surface-950 px-4 py-3 text-center dark:bg-surface-200/40">
            {detail ? (
              <>
                <p className="font-display text-sm font-bold uppercase tracking-wide text-surface-50 dark:text-white">
                  {REGION_META[detail.region].label}
                  <span className="ml-2 font-body text-xs font-normal normal-case tracking-normal text-accent-600 dark:text-accent-400">
                    {RECOVERY_STATUS_LABELS[recoveryStatus(detail.freshness)]} ·{' '}
                    {Math.round(detail.freshness * 100)}%
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-600">
                  {hoursLabel(detail.hoursSinceTrained)}
                </p>
              </>
            ) : (
              <p className="pt-2 text-sm text-surface-500 dark:text-surface-600">
                Tap a muscle for detail. Brighter means less recovered.
              </p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <TrainingSuggestions recovery={recovery} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="forge-card p-4 sm:p-5">
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-surface-50 dark:text-white">
              Ready to train
            </h2>
            <ul className="space-y-1">
              {readiest.map((r) => (
                <li key={r.region}>
                  <RegionButton
                    region={r.region}
                    freshness={r.freshness}
                    selected={selected === r.region}
                    onSelect={selectRegion}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="forge-card p-4 sm:p-5">
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-surface-50 dark:text-white">
              Still recovering
            </h2>
            {needsRest.length === 0 ? (
              <p className="text-sm text-surface-500 dark:text-surface-600">
                Nothing is under-recovered. Good to go.
              </p>
            ) : (
              <ul className="space-y-1">
                {needsRest.map((r) => (
                  <li key={r.region}>
                    <RegionButton
                      region={r.region}
                      freshness={r.freshness}
                      selected={selected === r.region}
                      onSelect={selectRegion}
                      emphasis
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p className="form-hint mt-4 text-center">
          An estimate from your logged sets — it can&apos;t see sleep, food or stress. Trust how you
          feel over what this says.
        </p>
      </div>
    </motion.div>
  );
}
