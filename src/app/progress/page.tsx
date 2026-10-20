'use client';

import { useState } from 'react';
import Link from 'next/link';
import { queryKeys } from '@/lib/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { DashboardCard } from '@/components/ui/dashboard/DashboardCard';
import { useProfile } from '@/lib/hooks/useProfile';
import { formatVolume } from '@/utils/formatters';
import { formatDurationCompact } from '@/utils/durationUtils';
import { formatPRValue } from '@/utils/prFormatting';

const PERIODS = [
  { key: '7d', label: '7D', name: 'last 7 days' },
  { key: '30d', label: '30D', name: 'last 30 days' },
  { key: '90d', label: '90D', name: 'last 90 days' },
  { key: '1y', label: '1Y', name: 'last year' },
  { key: 'all', label: 'All', name: 'all time' },
];

interface Delta {
  value: number;
  change: number;
  isNew: boolean;
}

interface ProgressData {
  period: { label: string; groupBy: 'day' | 'week' | 'month' };
  summary: { workouts: Delta; volume: Delta; hours: Delta; distance: Delta; sets: Delta };
  frequency: Array<{ date: string; workouts: number; volume: number; hours: number; distance: number }>;
  topExercises: Array<{ name: string; volume: number; sets: number; sessions: number }>;
  recentSessions: Array<{ date: string; name: string; volume: number; sets: number; duration: number; distance: number }>;
}

/** Bucket keys are "YYYY-MM-DD" (day/week) or "YYYY-MM" (month). */
function bucketLabel(key: string, groupBy: ProgressData['period']['groupBy']): string {
  const [y, m, d] = key.split('-').map(Number);
  // Noon UTC so no zone can roll the label onto a neighbouring day.
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12));
  return groupBy === 'month'
    ? date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function Change({ delta, comparable }: { delta: Delta; comparable: boolean }) {
  if (!comparable || delta.isNew || delta.change === 0) return null;
  const up = delta.change > 0;
  return (
    <span className={`text-xs font-medium tabular ${up ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
      {up ? '+' : '−'}
      {Math.abs(delta.change)}%
    </span>
  );
}

/**
 * Bars on a real time axis — every bucket in the period, empty ones included —
 * with the value of the tallest bar labelled so the chart has a scale.
 */
function Bars({
  data,
  valueKey,
  groupBy,
  format,
}: {
  data: ProgressData['frequency'];
  valueKey: 'workouts' | 'volume';
  groupBy: ProgressData['period']['groupBy'];
  format: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  if (data.length === 0) return null;
  const mid = data[Math.floor(data.length / 2)];
  return (
    <div>
      <div className="relative h-28">
        <span className="absolute right-0 top-0 text-[10px] text-surface-500 tabular">{format(max)}</span>
        <div className="absolute inset-x-0 bottom-0 top-4 flex items-end gap-[2px]">
          {data.map((d) => (
            <div
              key={d.date}
              className={`flex-1 rounded-t-[2px] ${d[valueKey] > 0 ? 'bg-accent-500' : 'bg-black/[0.05] dark:bg-white/[0.06]'}`}
              style={{ height: d[valueKey] > 0 ? `${Math.max(4, (d[valueKey] / max) * 100)}%` : '2px' }}
              title={`${bucketLabel(d.date, groupBy)}: ${format(d[valueKey])}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-surface-500 dark:text-surface-600 tabular">
        <span>{bucketLabel(data[0].date, groupBy)}</span>
        {data.length > 4 && <span>{bucketLabel(mid.date, groupBy)}</span>}
        <span>{bucketLabel(data[data.length - 1].date, groupBy)}</span>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { profile } = useProfile();
  const useMetric = profile?.useMetric ?? false;
  const [period, setPeriod] = useState('30d');
  const periodName = PERIODS.find((p) => p.key === period)?.name ?? '';

  // React Query rather than a bare effect: failures surface as an error state
  // instead of falling through to "no workouts", and retries come for free.
  const { data, isLoading, isError, refetch, isFetching } = useQuery<ProgressData>({
    queryKey: [...queryKeys.progress, period],
    queryFn: async () => {
      const response = await fetch(`/api/progress?period=${period}`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Failed to load progress');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const hasDistance = !!data && data.summary.distance.value > 0;
  const comparable = period !== 'all';
  const groupBy = data?.period.groupBy ?? 'day';
  const per = groupBy === 'day' ? 'per day' : groupBy === 'week' ? 'per week' : 'per month';

  const figures = data
    ? [
        { label: 'Workouts', value: String(data.summary.workouts.value), delta: data.summary.workouts },
        { label: 'Volume', value: formatVolume(data.summary.volume.value, useMetric), delta: data.summary.volume },
        { label: 'Hours', value: data.summary.hours.value.toFixed(1), delta: data.summary.hours },
        { label: 'Sets', value: String(data.summary.sets.value), delta: data.summary.sets },
        ...(hasDistance
          ? [{ label: 'Distance', value: formatPRValue(data.summary.distance.value, 'maxDistance', useMetric), delta: data.summary.distance }]
          : []),
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <PageHeader
        title="Progress"
        description={comparable ? `Compared with the ${periodName.replace('last ', 'previous ')}` : 'Everything you have logged'}
        actions={
          // Five short labels fit a phone in one row; the old chips were
          // uppercase words that ran off the screen.
          <div role="tablist" aria-label="Period" className="flex rounded-lg bg-black/[0.05] p-0.5 dark:bg-white/[0.06]">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                role="tab"
                aria-selected={period === p.key}
                aria-label={p.name}
                onClick={() => setPeriod(p.key)}
                className={`tap-control min-h-[36px] min-w-[48px] rounded-md px-3 text-xs font-semibold transition-colors ${
                  period === p.key
                    ? 'bg-white text-surface-50 shadow-sm dark:bg-surface-300 dark:text-white'
                    : 'text-surface-500 hover:text-surface-50 dark:text-surface-600 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <div className="forge-card h-40 animate-pulse" aria-busy="true" aria-label="Loading progress" />
      ) : isError ? (
        <ErrorState what="progress data" onRetry={() => void refetch()} isRetrying={isFetching} />
      ) : !data || data.summary.workouts.value === 0 ? (
        <div className="forge-card px-6 py-10 text-center">
          <p className="font-medium text-surface-50 dark:text-white">No workouts in the {periodName}</p>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-600">Pick a longer period, or go train.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="forge-card grid grid-cols-2 gap-px overflow-hidden bg-black/[0.06] dark:bg-white/[0.06] sm:grid-cols-5">
            {figures.map((f) => (
              <div key={f.label} className="bg-white px-4 py-3.5 dark:bg-surface-100">
                <dt className="stat-label">{f.label}</dt>
                <dd className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-xl font-semibold text-surface-50 dark:text-white tabular">{f.value}</span>
                  <Change delta={f.delta} comparable={comparable} />
                </dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DashboardCard title={`Workouts ${per}`}>
              <Bars data={data.frequency} valueKey="workouts" groupBy={groupBy} format={(n) => String(n)} />
            </DashboardCard>
            <DashboardCard title={`Volume ${per}`}>
              <Bars data={data.frequency} valueKey="volume" groupBy={groupBy} format={(n) => formatVolume(n, useMetric)} />
            </DashboardCard>

            {data.topExercises.length > 0 && (
              <DashboardCard title="Most volume">
                <ol className="space-y-2.5">
                  {data.topExercises.slice(0, 8).map((ex) => {
                    const pct = (ex.volume / (data.topExercises[0].volume || 1)) * 100;
                    return (
                      <li key={ex.name}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <Link
                            href={`/exercise/${encodeURIComponent(ex.name)}`}
                            className="truncate font-medium text-surface-50 hover:text-accent-600 dark:text-white dark:hover:text-accent-400"
                          >
                            {ex.name}
                          </Link>
                          <span className="shrink-0 text-xs text-surface-500 dark:text-surface-600 tabular">
                            {ex.sets} sets · {formatVolume(ex.volume, useMetric)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
                          <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </DashboardCard>
            )}

            {data.recentSessions.length > 0 && (
              <DashboardCard title="Sessions" action={{ href: '/history', label: 'History' }}>
                <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  {data.recentSessions.slice(0, 8).map((s, i) => (
                    <li key={`${s.date}-${i}`} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-surface-50 dark:text-white">{s.name}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-600">
                          {new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-xs text-surface-500 dark:text-surface-600 tabular">
                        {formatDurationCompact(s.duration)}
                        <br />
                        {s.volume > 0
                          ? formatVolume(s.volume, useMetric)
                          : s.distance > 0
                            ? formatPRValue(s.distance, 'maxDistance', useMetric)
                            : `${s.sets} ${s.sets === 1 ? 'set' : 'sets'}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </DashboardCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
