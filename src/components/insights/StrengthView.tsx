'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import type { InsightsResponse } from '@/lib/hooks/useInsights';
import { FLAT_THRESHOLD, type ExerciseTrend } from '@/utils/strengthInsights';
import { REGION_META, type BodyRegion } from '@/lib/muscleRegions';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkline } from './Sparkline';
import { ChangeText } from './ChangeText';

const unitOf = (useMetric: boolean) => (useMetric ? 'kg' : 'lbs');

/** "3 weeks", "5 days" — for "no new best in …". */
function spanLabel(days: number): string {
  if (days >= 14) return `${Math.floor(days / 7)} weeks`;
  return `${days} days`;
}

function TrendRow({ t, useMetric }: { t: ExerciseTrend; useMetric: boolean }) {
  const regionLabel = t.region ? REGION_META[t.region].label : null;
  return (
    <li>
      <Link
        href={`/exercise/${encodeURIComponent(t.name)}`}
        className="-mx-4 flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02] sm:-mx-5 sm:px-5 dark:hover:bg-white/[0.02]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-surface-50 dark:text-white">{t.name}</p>
          <p className="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-600">
            {t.stalled ? (
              // The one line on this screen that asks for action, so it is the
              // one that gets a colour.
              <span className="text-warning-700 dark:text-warning-400">
                No new best in {spanLabel(t.daysSinceBest ?? 0)}
              </span>
            ) : t.status === 'new' ? (
              `${t.sessions} session${t.sessions === 1 ? '' : 's'} so far`
            ) : (
              // The muscle is what the filter chips are for; the row spends its
              // room on the rate, which is the thing only this row can say.
              t.perWeek !== null && Math.abs(t.perWeek) >= 0.1
                ? `${t.perWeek > 0 ? '+' : '−'}${Math.abs(t.perWeek).toFixed(1)} ${unitOf(useMetric)}/wk · ${t.sessions} sessions`
                : `${t.sessions} sessions${regionLabel ? ` · ${regionLabel}` : ''}`
            )}
          </p>
        </div>
        <Sparkline
          values={t.points.map((p) => p.e1rm)}
          width={64}
          label={`Estimated 1RM over ${t.sessions} sessions`}
          className="hidden min-[360px]:block"
        />
        <div className="w-16 shrink-0 text-right">
          <p className="figure text-base leading-none">
            {Math.round(t.current)}
            <span className="ml-0.5 font-body text-[11px] font-medium text-surface-500 dark:text-surface-600">
              {unitOf(useMetric)}
            </span>
          </p>
          <ChangeText percent={t.change === null ? null : t.change * 100} flatBand={FLAT_THRESHOLD * 100} className="mt-1 block" />
        </div>
      </Link>
    </li>
  );
}

/**
 * "Am I getting stronger?" — every lift in the window, as estimated 1RM.
 */
export function StrengthView({ data, useMetric }: { data: InsightsResponse; useMetric: boolean }) {
  const [region, setRegion] = useState<BodyRegion | 'all'>('all');

  const trends = data.exercises;
  const withTrend = trends.filter((t) => t.status !== 'new');
  const up = withTrend.filter((t) => t.status === 'up');
  const stalled = trends.filter((t) => t.stalled);
  const biggest = [...withTrend].sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0];

  const regionsPresent = useMemo(() => {
    const set = new Set(trends.map((t) => t.region).filter((r): r is BodyRegion => r !== null));
    return [...set].sort((a, b) => REGION_META[a].label.localeCompare(REGION_META[b].label));
  }, [trends]);

  const shown = useMemo(() => {
    const list = region === 'all' ? trends : trends.filter((t) => t.region === region);
    // Trends first, biggest gain at the top; lifts without enough sessions last.
    return [...list].sort((a, b) => {
      if ((a.change === null) !== (b.change === null)) return a.change === null ? 1 : -1;
      return (b.change ?? 0) - (a.change ?? 0) || b.sessions - a.sessions;
    });
  }, [trends, region]);

  if (trends.length === 0) {
    return (
      <EmptyState
        icon={ChartBarIcon}
        title="No lifts in this period"
        hint="Strength is measured from weighted sets of 12 reps or fewer. Pick a longer period, or log a lift."
      />
    );
  }

  return (
    <div className="space-y-4">
      <dl className="forge-card grid grid-cols-3 divide-x divide-black/[0.06] dark:divide-white/[0.06]">
        <div className="px-4 py-3.5">
          <dt className="stat-label">Stronger</dt>
          <dd className="mt-1.5">
            <span className="figure text-xl leading-none">{up.length}</span>
            <span className="ml-1 text-xs text-surface-500 dark:text-surface-600">of {withTrend.length}</span>
          </dd>
        </div>
        <div className="px-4 py-3.5">
          <dt className="stat-label">Stalled</dt>
          <dd className="figure mt-1.5 text-xl leading-none">{stalled.length}</dd>
        </div>
        <div className="min-w-0 px-4 py-3.5">
          <dt className="stat-label">Best gain</dt>
          <dd className="mt-1.5 min-w-0">
            {biggest && biggest.change !== null && biggest.change > 0 ? (
              <>
                <span className="figure text-xl leading-none">+{Math.round(biggest.change * 100)}%</span>
                <span className="mt-0.5 block truncate text-xs text-surface-500 dark:text-surface-600">{biggest.name}</span>
              </>
            ) : (
              <span className="figure text-xl leading-none">—</span>
            )}
          </dd>
        </div>
      </dl>

      {regionsPresent.length > 1 && (
        <div className="scroll-touch -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Muscle">
          <button type="button" aria-pressed={region === 'all'} onClick={() => setRegion('all')} className="chip shrink-0">
            All
          </button>
          {regionsPresent.map((r) => (
            <button key={r} type="button" aria-pressed={region === r} onClick={() => setRegion(r)} className="chip shrink-0">
              {REGION_META[r].label}
            </button>
          ))}
        </div>
      )}

      <section className="forge-card px-4 sm:px-5">
        <div className="flex items-baseline justify-between gap-3 pb-1 pt-4">
          <h2 className="section-title">Estimated 1RM</h2>
          <p className="text-xs text-surface-500 dark:text-surface-600">Change since the start of the period</p>
        </div>
        <ul className="row-list">
          {shown.map((t) => (
            <TrendRow key={t.key} t={t} useMetric={useMetric} />
          ))}
        </ul>
      </section>

      <p className="form-hint text-center">
        From your best set of each session. One heavy or light day moves it a little; the direction
        over weeks is what counts.
      </p>
    </div>
  );
}
