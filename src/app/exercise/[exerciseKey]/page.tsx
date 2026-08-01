'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useExerciseHistory } from '@/lib/hooks/useExerciseHistory';
import { useProfile } from '@/lib/hooks/useProfile';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatVolume } from '@/utils/formatters';
import { formatPRValue, PR_TYPE_LABELS, PR_TYPE_ICONS } from '@/utils/prFormatting';
import { formatDurationHuman } from '@/utils/durationUtils';
import { PR_TYPES, type PRType } from '@/types/personalRecords';
import type { ExerciseHistoryPoint } from '@/app/api/exercise/[exerciseId]/history/route';

const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

type Metric = 'oneRepMax' | 'heaviest' | 'volume';

const METRICS: { id: Metric; label: string }[] = [
  { id: 'oneRepMax', label: 'Est. 1RM' },
  { id: 'heaviest', label: 'Heaviest' },
  { id: 'volume', label: 'Volume' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    metric === 'volume' ? formatVolume(v, useMetric) : `${Math.round(v * 10) / 10}${useMetric ? 'kg' : 'lb'}`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${metric} trend`}>
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
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
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

  if (isLoading) {
    return (
      <div className="app-bg py-8 px-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-32 animate-pulse rounded-xl bg-surface-900 dark:bg-surface-200" />
          <div className="h-64 animate-pulse rounded-xl bg-surface-900 dark:bg-surface-200" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-bg py-8 px-4">
        <div className="mx-auto max-w-3xl">
          <ErrorState what="this exercise's history" onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  const isCardio = data.exerciseType === 'cardio';
  const sessions = [...data.history].reverse(); // newest first for the list

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={springGentle}
      className="app-bg py-8 px-4"
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
                  Exercise history
                </p>
                <h1 className="truncate font-display text-2xl font-bold tracking-wide sm:text-3xl">
                  {data.name}
                </h1>
              </div>
            </div>
            {(data.muscles.length > 0 || data.equipment.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...data.muscles, ...data.equipment].slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {data.history.length === 0 ? (
          <div className="forge-card p-8 text-center">
            <ChartBarIcon className="mx-auto h-10 w-10 text-surface-500" />
            <h2 className="mt-3 font-display text-lg font-bold uppercase tracking-wide text-surface-50 dark:text-white">
              No sessions yet
            </h2>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-600">
              Log a workout with {data.name} and its history will build here.
            </p>
          </div>
        ) : (
          <>
            {records.length > 0 && (
              <div className="mb-6">
                <h2 className="form-label">Personal Records</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {records.map((r) => (
                    <div key={r.type} className="forge-card p-3">
                      <div className="flex items-center gap-1.5">
                        <span aria-hidden="true">{PR_TYPE_ICONS[r.type]}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-600">
                          {PR_TYPE_LABELS[r.type]}
                        </span>
                      </div>
                      <p className="mt-1 font-display text-lg font-bold tabular text-surface-50 dark:text-white">
                        {formatPRValue(r.value, r.type, useMetric)}
                      </p>
                      <p className="text-[11px] text-surface-500 dark:text-surface-600">
                        {formatDate(r.achievedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isCardio && (
              <div className="forge-card mb-6 p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-bold uppercase tracking-wider text-surface-50 dark:text-white">
                    Trend
                  </h2>
                  <div className="flex gap-1.5">
                    {METRICS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMetric(m.id)}
                        aria-pressed={metric === m.id}
                        className={`tap-control min-h-[38px] rounded-lg px-3 text-xs font-display font-semibold uppercase tracking-wide transition-colors ${
                          metric === m.id
                            ? 'bg-accent-500 text-white'
                            : 'bg-surface-900 text-surface-600 dark:bg-surface-200 dark:text-surface-800'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <TrendChart history={data.history} metric={metric} useMetric={useMetric} />
              </div>
            )}

            <div className="forge-card p-4 sm:p-5">
              <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-surface-50 dark:text-white">
                Sessions
                <span className="ml-2 font-body text-xs font-normal normal-case tracking-normal text-surface-500 dark:text-surface-600">
                  {sessions.length}
                  {data.truncated && '+'}
                </span>
              </h2>
              <ul className="divide-y divide-surface-900 dark:divide-surface-300">
                {sessions.map((s) => (
                  <li key={`${s.sessionId}-${s.performedAt}`} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold text-surface-50 dark:text-white">
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
                        <p className="font-display text-sm font-bold tabular text-surface-50 dark:text-white">
                          {Math.round(s.oneRepMax * 10) / 10}
                          {useMetric ? 'kg' : 'lb'}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-surface-500 dark:text-surface-600">
                          e1RM
                          {s.bestSet && ` · ${s.bestSet.weight}×${s.bestSet.reps}`}
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
    </motion.div>
  );
}
