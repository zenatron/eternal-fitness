'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { use, useMemo, useState } from 'react';

import { motion, useReducedMotion } from 'framer-motion';

import { ChartBarIcon } from '@heroicons/react/24/outline';
import { useExerciseHistory } from '@/lib/hooks/useExerciseHistory';
import { useProfile } from '@/lib/hooks/useProfile';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatVolume, formatWeight } from '@/utils/formatters';
import { formatPRValue, PR_TYPE_LABELS } from '@/utils/prFormatting';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChangeText } from '@/components/insights/ChangeText';
import { exerciseTrend, FLAT_THRESHOLD } from '@/utils/strengthInsights';
import { dayKeyOf, daysBetween, todayKey, deviceTimeZone } from '@/utils/datetime';
import { formatDurationHuman } from '@/utils/durationUtils';
import { PR_TYPES, type PRType } from '@/types/personalRecords';
import type { ExerciseHistoryPoint } from '@/app/api/exercise/[exerciseId]/history/route';

type Metric = 'oneRepMax' | 'heaviest' | 'volume';

const METRICS: { id: Metric; label: string }[] = [
  { id: 'oneRepMax', label: 'Est. 1RM' },
  { id: 'heaviest', label: 'Heaviest' },
  { id: 'volume', label: 'Volume' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Line chart over the selected metric.
 *
 * Drawn as an SVG polyline rather than pulled from a charting library: the app
 * ships one already-large client bundle, and this needs a line, a fill and a
 * last-point marker. Points with no value for the metric are skipped rather
 * than plotted as zero, which would draw a cliff every time a session had only
 * high-rep sets.
 */
function TrendChart({
  history,
  metric,
  useMetric,
}: {
  history: ExerciseHistoryPoint[];
  metric: Metric;
  useMetric: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();

  const points = useMemo(
    () =>
      history
        .map((h) => ({ at: h.performedAt, value: h[metric] }))
        .filter((p): p is { at: string; value: number } => typeof p.value === 'number' && p.value > 0),
    [history, metric]
  );

  if (points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-surface-950 text-sm text-surface-500 dark:bg-surface-200/40 dark:text-surface-600">
        {points.length === 0
          ? 'No data for this metric yet'
          : 'One session so far — a trend needs at least two'}
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  // A flat series would divide by zero; give it a band so the line sits centred.
  const range = max - min || max || 1;
  const W = 300;
  const H = 140;
  const PAD = 10;

  const coords = points.map((p, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p.value - min) / range) * (H - PAD * 2);
    return { x, y, ...p };
  });

  const line = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const area = `${PAD},${H - PAD} ${line} ${W - PAD},${H - PAD}`;
  const last = coords[coords.length - 1];

  const label = (v: number) =>
    metric === 'volume'
      ? formatVolume(v, useMetric)
      : metric === 'oneRepMax'
        ? // An estimate: whole numbers, like everywhere else it is shown.
          `${Math.round(v)} ${useMetric ? 'kg' : 'lbs'}`
        : formatWeight(v, useMetric);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${METRICS.find((m) => m.id === metric)?.label ?? metric} trend`}>
        <polygon points={area} className="fill-accent-500/10" />
        <motion.polyline
          points={line}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-accent-500"
          initial={prefersReducedMotion ? {} : { pathLength: 0 }}
          animate={prefersReducedMotion ? {} : { pathLength: 1 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
        <circle cx={last.x} cy={last.y} r="4" className="fill-accent-500" />
      </svg>
      <div className="mt-1 flex items-center justify-between text-xs text-surface-500 dark:text-surface-600">
        <span className="tabular">
          {formatDate(points[0].at)} · {label(points[0].value)}
        </span>
        <span className="tabular font-semibold text-surface-50 dark:text-white">
          {formatDate(last.at)} · {label(last.value)}
        </span>
      </div>
    </div>
  );
}

export default function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ exerciseKey: string }>;
}) {
  const { exerciseKey } = use(params);
  const { profile } = useProfile();
  const useMetric = profile?.useMetric ?? false;
  const [metric, setMetric] = useState<Metric>('oneRepMax');

  const { data, isLoading, error, refetch } = useExerciseHistory(exerciseKey);

  const records = useMemo(() => {
    if (!data?.personalRecords) return [];
    return PR_TYPES.map((type) => {
      const rec = data.personalRecords[type as keyof typeof data.personalRecords];
      return rec ? { type: type as PRType, value: rec.value, achievedAt: rec.achievedAt } : null;
    }).filter(Boolean) as { type: PRType; value: number; achievedAt: string }[];
  }, [data]);

  // The same trend the Progress → Strength list shows, so the number on this
  // page and the number on that row are one calculation, not two.
  const trend = useMemo(() => {
    if (!data?.history) return null;
    const zone = deviceTimeZone();
    const points = data.history
      .filter((h) => h.oneRepMax !== null)
      .map((h) => ({
        day: dayKeyOf(h.performedAt, zone),
        e1rm: h.oneRepMax as number,
        weight: h.bestSet?.weight ?? 0,
        reps: h.bestSet?.reps ?? 0,
      }));
    const t = exerciseTrend(data.exerciseKey, points);
    return t ? { ...t, daysSinceBest: daysBetween(t.bestDay, todayKey(zone)) } : null;
  }, [data]);

  if (isLoading) {
    return (
      <div className="px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
        <div className="mx-auto max-w-3xl space-y-4" role="status" aria-label="Loading">
          <div className="h-32 animate-pulse rounded-xl bg-surface-900 dark:bg-surface-200" />
          <div className="h-64 animate-pulse rounded-xl bg-surface-900 dark:bg-surface-200" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
        <div className="mx-auto max-w-3xl">
          <ErrorState what="this exercise's history" onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  const isCardio = data.exerciseType === 'cardio';
  const sessions = [...data.history].reverse(); // newest first for the list

  return (
    <div className="px-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          back
          eyebrow="Exercise"
          title={data.name}
          description={[...data.muscles, ...data.equipment].slice(0, 6).join(' · ') || undefined}
        />

        {data.history.length === 0 ? (
          <EmptyState
            icon={ChartBarIcon}
            title="No sessions yet"
            hint={`Log a workout with ${data.name} and its history will build here.`}
          />
        ) : (
          <>
            {!isCardio && trend && (
              <dl className="forge-card mb-4 grid grid-cols-3 divide-x divide-black/[0.06] dark:divide-white/[0.06]">
                <div className="px-4 py-3.5">
                  <dt className="stat-label">Est. 1RM</dt>
                  <dd className="figure mt-1.5 text-xl leading-none">
                    {Math.round(trend.current)}
                    <span className="ml-1 font-body text-xs font-medium text-surface-500 dark:text-surface-600">
                      {useMetric ? 'kg' : 'lbs'}
                    </span>
                  </dd>
                </div>
                <div className="px-4 py-3.5">
                  <dt className="stat-label">Change</dt>
                  <dd className="mt-1.5 leading-none">
                    {trend.change === null ? (
                      <span className="text-xs text-surface-500 dark:text-surface-600">Needs 3 sessions</span>
                    ) : (
                      <ChangeText percent={trend.change * 100} flatBand={FLAT_THRESHOLD * 100} className="!text-xl font-display font-semibold" />
                    )}
                    {trend.perWeek !== null && (
                      <span className="mt-1 block text-xs text-surface-500 dark:text-surface-600 tabular">
                        {trend.perWeek >= 0 ? '+' : '−'}
                        {Math.abs(trend.perWeek).toFixed(1)} {useMetric ? 'kg' : 'lbs'}/wk
                      </span>
                    )}
                  </dd>
                </div>
                <div className="px-4 py-3.5">
                  <dt className="stat-label">Best</dt>
                  <dd className="figure mt-1.5 text-xl leading-none">{Math.round(trend.best)}</dd>
                  <dd
                    className={`mt-1 text-xs ${
                      trend.daysSinceBest >= 21 && trend.status !== 'new'
                        ? 'text-warning-700 dark:text-warning-400'
                        : 'text-surface-500 dark:text-surface-600'
                    }`}
                  >
                    {trend.daysSinceBest === 0
                      ? 'Today'
                      : trend.daysSinceBest < 14
                        ? `${trend.daysSinceBest}d ago`
                        : `${Math.floor(trend.daysSinceBest / 7)} weeks ago`}
                  </dd>
                </div>
              </dl>
            )}

            {!isCardio && (
              <div className="forge-card mb-6 p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="section-title">Trend</h2>
                  <div className="flex gap-1.5" role="group" aria-label="Trend metric">
                    {METRICS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMetric(m.id)}
                        aria-pressed={metric === m.id}
                        className="chip"
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <TrendChart history={data.history} metric={metric} useMetric={useMetric} />
              </div>
            )}

            {records.length > 0 && (
              <div className="mb-6">
                <h2 className="section-title mb-2">Personal records</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {records.map((r) => (
                    <div key={r.type} className="forge-card p-3">
                      <p className="stat-label">{PR_TYPE_LABELS[r.type]}</p>
                      <p className="figure mt-1.5 text-lg leading-none">
                        {formatPRValue(r.value, r.type, useMetric)}
                      </p>
                      <p className="mt-1 text-xs text-surface-500 dark:text-surface-600">
                        {formatDate(r.achievedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="forge-card p-4 sm:p-5">
              <h2 className="section-title mb-3">
                Sessions
                <span className="ml-2 text-xs font-normal text-surface-500 dark:text-surface-600">
                  {sessions.length}
                  {data.truncated && '+'}
                </span>
              </h2>
              <ul className="row-list">
                {sessions.map((s) => (
                  <li key={`${s.sessionId}-${s.performedAt}`} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-surface-50 dark:text-white">
                        {formatDate(s.performedAt)}
                      </p>
                      <p className="truncate text-xs text-surface-500 dark:text-surface-600">
                        {isCardio
                          ? [
                              s.duration > 0 && formatDurationHuman(s.duration),
                              s.distance > 0 && `${s.distance}${useMetric ? 'km' : 'mi'}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : `${s.sets} sets · ${s.totalReps} reps · ${formatVolume(s.volume, useMetric)}`}
                      </p>
                    </div>
                    {s.oneRepMax !== null && (
                      <div className="shrink-0 text-right">
                        <p className="figure text-base">
                          {Math.round(s.oneRepMax)} {useMetric ? 'kg' : 'lbs'}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-600">
                          Est. 1RM
                          {/* "135×10" read as a bare number with no unit on a
                              page where every other figure carries one. */}
                          {s.bestSet && ` · ${s.bestSet.weight} × ${s.bestSet.reps}`}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {data.truncated && (
                <p className="form-hint">
                  Showing the most recent sessions only.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
