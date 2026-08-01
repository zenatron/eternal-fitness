'use client';

import { useState, useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  ArrowLeftIcon,
  ChartBarIcon,
  FireIcon,
  ClockIcon,
  ScaleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { useProfile } from '@/lib/hooks/useProfile';
import { formatVolume } from '@/utils/formatters';
import { formatDurationHuman } from '@/utils/durationUtils';
import { formatPRValue } from '@/utils/prFormatting';
import { springSnappy, springBouncy, springGentle } from '@/lib/motion';


const PERIODS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '1y', label: '1 Year' },
  { key: 'all', label: 'All Time' },
];

interface ProgressData {
  period: { label: string; groupBy: string };
  summary: {
    workouts: { value: number; change: number; isNew: boolean };
    volume: { value: number; change: number; isNew: boolean };
    hours: { value: number; change: number; isNew: boolean };
    distance: { value: number; change: number; isNew: boolean };
    sets: { value: number; change: number; isNew: boolean };
  };
  frequency: Array<{ date: string; workouts: number; volume: number; hours: number; distance: number }>;
  topExercises: Array<{ name: string; volume: number; sets: number; sessions: number }>;
  recentSessions: Array<{ date: string; name: string; volume: number; sets: number; duration: number; distance: number }>;
}

function StatPill({ label, value, change, isNew, format, icon: Icon, delay }: {
  label: string; value: string; change: number; isNew: boolean; format: string; icon: any; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springBouncy, delay }}
      className="forge-card p-4 flex flex-col items-center text-center"
    >
      <Icon className="w-5 h-5 text-surface-500 dark:text-surface-600 mb-1.5" />
      <span className="text-xl font-display font-black text-surface-50 dark:text-white">{value}</span>
      <span className="text-xs text-surface-500 dark:text-surface-600 uppercase tracking-wider mt-0.5">{label}</span>
      {isNew ? (
        <span className="text-[10px] font-bold text-accent-500 mt-1">NEW</span>
      ) : change !== 0 ? (
        <span className={`text-[10px] font-bold mt-1 ${change > 0 ? 'text-success-500' : 'text-danger-500'}`}>
          {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
        </span>
      ) : (
        <span className="text-[10px] text-surface-400 mt-1">—</span>
      )}
    </motion.div>
  );
}

function BarChart({ data, valueKey, color, maxValue, delay }: {
  data: Array<Record<string, any>>;
  valueKey: string;
  color: string;
  maxValue: number;
  delay: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  if (!data.length) return null;

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const pct = maxValue > 0 ? (val / maxValue) * 100 : 0;
        return (
          <motion.div
            key={i}
            className="flex-1 flex flex-col items-center justify-end h-full"
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={prefersReducedMotion ? {} : { opacity: 1 }}
            transition={{ delay: delay + i * 0.02 }}
          >
            <motion.div
              className={`w-full rounded-t-sm ${color}`}
              initial={prefersReducedMotion ? {} : { height: 0 }}
              animate={prefersReducedMotion ? {} : { height: `${Math.max(pct, 1)}%` }}
              transition={{ duration: 0.6, delay: delay + i * 0.02, ease: 'easeOut' }}
              style={{ minHeight: val > 0 ? '4px' : '0' }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

function Sparkline({ data, valueKey, color }: { data: Array<Record<string, any>>; valueKey: string; color: string }) {
  const prefersReducedMotion = useReducedMotion();
  if (data.length < 2) return null;

  const values = data.map(d => d[valueKey] || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const h = 64;
  const w = 200;
  const pad = 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
      <motion.polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={color}
        initial={prefersReducedMotion ? {} : { strokeDasharray: '300', strokeDashoffset: '300' }}
        animate={prefersReducedMotion ? {} : { strokeDashoffset: '0' }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />
    </svg>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ProgressPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { profile } = useProfile();
  const useMetric = profile?.useMetric ?? false;

  const [period, setPeriod] = useState('30d');

  /*
   * React Query rather than a bare useEffect + fetch. The previous version
   * swallowed failures with `.catch(console.error)` and fell through to the
   * empty state, so a network error was indistinguishable from having no
   * workouts. This also gets retry, and serves the service worker's cached copy
   * when offline.
   */
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<ProgressData>({
    queryKey: [...queryKeys.progress, period],
    queryFn: async () => {
      const response = await fetch(`/api/progress?period=${period}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('Failed to load progress');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const maxFreq = data ? Math.max(...data.frequency.map(d => d.workouts), 1) : 1;
  const maxVol = data ? Math.max(...data.frequency.map(d => d.volume), 1) : 1;
  const hasDistance = data ? data.frequency.some(d => d.distance > 0) : false;

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="app-bg py-8 px-4"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="forge-card overflow-hidden mb-6">
          <div className="relative px-5 py-6 sm:px-8 sm:py-8 text-white greeting-gradient">
            <div className="absolute inset-0 bg-black/10" />
            {/* Title and period selector are on separate rows. Sharing one row
                pushed three of the five periods off the side of a phone, with
                no way to scroll to them — they were simply unreachable. */}
            <div className="relative">
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => router.back()}
                  aria-label="Go back"
                  className="touch-target flex shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors tap-control"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                  transition={springSnappy}
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </motion.button>
                <div className="min-w-0 flex-1">
                  <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-display font-bold tracking-wide uppercase">
                    <ChartBarIcon className="w-7 h-7 shrink-0" />
                    Progress
                  </h1>
                  <p className="text-accent-100 text-sm mt-0.5">
                    Your training analytics at a glance
                  </p>
                </div>
              </div>

              {/* Scrollable on narrow screens; the bleed keeps the first and
                  last chips flush with the card padding while scrolling. */}
              <div className="scroll-touch -mx-5 mt-5 flex gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                {PERIODS.map(p => (
                  <motion.button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    aria-pressed={period === p.key}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                    transition={springSnappy}
                    className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 min-h-[38px] text-xs font-display font-semibold uppercase tracking-wider transition-colors tap-control ${
                      period === p.key
                        ? 'bg-white text-accent-700 shadow-sm'
                        : 'bg-white/10 text-white/80 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    {p.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="forge-card p-12 text-center text-surface-500">Loading...</div>
        ) : isError ? (
          <ErrorState
            what="progress data"
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        ) : !data ? (
          <div className="forge-card p-12 text-center text-surface-500">
            No workouts logged in this period yet.
          </div>
        ) : (
          <>
            {/* Stat Pills */}
            {/* Two columns on mobile rather than three: the pill count is 4 or 5
                depending on whether any distance was logged, and a 3-wide grid
                left a single orphan pill beside a large empty gap. The arbitrary
                variant makes a lone final pill span the full width instead. */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
              <StatPill label="Workouts" value={String(data.summary.workouts.value)} change={data.summary.workouts.change} isNew={data.summary.workouts.isNew} format="workouts" icon={FireIcon} delay={0.1} />
              <StatPill label="Volume" value={formatVolume(data.summary.volume.value, useMetric)} change={data.summary.volume.change} isNew={data.summary.volume.isNew} format="volume" icon={ScaleIcon} delay={0.15} />
              <StatPill label="Hours" value={`${data.summary.hours.value}h`} change={data.summary.hours.change} isNew={data.summary.hours.isNew} format="hours" icon={ClockIcon} delay={0.2} />
              {hasDistance && (
                <StatPill label="Distance" value={formatPRValue(data.summary.distance.value, 'maxDistance', useMetric)} change={data.summary.distance.change} isNew={data.summary.distance.isNew} format="distance" icon={MapPinIcon} delay={0.25} />
              )}
              <StatPill label="Sets" value={String(data.summary.sets.value)} change={data.summary.sets.change} isNew={data.summary.sets.isNew} format="sets" icon={ChartBarIcon} delay={0.3} />
            </div>

            {/* Charts Grid */}
            <div className="columns-1 lg:columns-2 gap-6 mb-6 [&>*]:break-inside-avoid [&>*]:mb-6">
              {/* Workout Frequency */}
              <div className="forge-card p-6">
                <h3 className="text-lg font-display font-bold text-surface-50 dark:text-white mb-4 flex items-center gap-2">
                  <FireIcon className="w-5 h-5 text-accent-500" />
                  Workout Frequency
                </h3>
                <BarChart data={data.frequency} valueKey="workouts" color="bg-gradient-to-t from-success-400 to-success-500" maxValue={maxFreq} delay={0.4} />
                <div className="flex justify-between mt-2 text-[10px] text-surface-400 dark:text-surface-600 font-display uppercase tracking-wider">
                  {data.frequency.length > 0 && (
                    <>
                      <span>{formatDate(data.frequency[0].date)}</span>
                      <span>{formatDate(data.frequency[Math.floor(data.frequency.length / 2)].date)}</span>
                      <span>{formatDate(data.frequency[data.frequency.length - 1].date)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Volume Trend */}
              <div className="forge-card p-6">
                <h3 className="text-lg font-display font-bold text-surface-50 dark:text-white mb-4 flex items-center gap-2">
                  <ScaleIcon className="w-5 h-5 text-accent-500" />
                  Volume Trend
                </h3>
                <Sparkline data={data.frequency} valueKey="volume" color="text-accent-500" />
                <BarChart data={data.frequency} valueKey="volume" color="bg-gradient-to-t from-accent-400 to-accent-600" maxValue={maxVol} delay={0.5} />
                <div className="flex justify-between mt-2 text-[10px] text-surface-400 dark:text-surface-600 font-display uppercase tracking-wider">
                  {data.frequency.length > 0 && (
                    <>
                      <span>{formatDate(data.frequency[0].date)}</span>
                      <span>{formatDate(data.frequency[data.frequency.length - 1].date)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Top Exercises */}
              {data.topExercises.length > 0 && (
                <div className="forge-card p-6">
                  <h3 className="text-lg font-display font-bold text-surface-50 dark:text-white mb-4 flex items-center gap-2">
                    <FireIcon className="w-5 h-5 text-accent-500" />
                    Top Exercises
                  </h3>
                  <div className="space-y-2">
                    {data.topExercises.slice(0, 8).map((ex, i) => {
                      const maxExVol = data.topExercises[0].volume || 1;
                      const pct = (ex.volume / maxExVol) * 100;
                      return (
                        <motion.div
                          key={ex.name}
                          initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                          animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.05 }}
                          className="flex items-center gap-3"
                        >
                          <span className="w-5 text-xs font-bold text-surface-400 text-right tabular-nums">{i + 1}</span>
                          <span className="w-28 text-sm font-medium text-surface-700 dark:text-surface-400 truncate">{ex.name}</span>
                          <div className="flex-1 h-5 bg-surface-900 dark:bg-surface-300/40 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-600"
                              initial={prefersReducedMotion ? {} : { width: 0 }}
                              animate={prefersReducedMotion ? {} : { width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: 0.6 + i * 0.05, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="w-16 text-xs font-semibold text-surface-600 dark:text-surface-400 text-right tabular-nums">
                            {formatVolume(ex.volume, useMetric)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Sessions */}
              {data.recentSessions.length > 0 && (
                <div className="forge-card p-6">
                  <h3 className="text-lg font-display font-bold text-surface-50 dark:text-white mb-4 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-info-500" />
                    Recent Sessions
                  </h3>
                  <div className="space-y-1">
                    {data.recentSessions.slice(0, 10).map((s, i) => (
                      <motion.div
                        key={i}
                        initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                        animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.03 }}
                        className="flex items-center justify-between py-2 border-b border-surface-200 dark:border-surface-300/20 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-surface-50 dark:text-white truncate">{s.name}</p>
                          <p className="text-xs text-surface-500">{formatDateFull(s.date)}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-surface-600 dark:text-surface-400 tabular-nums">
                          <span>{s.sets} sets</span>
                          <span>{formatVolume(s.volume, useMetric)}</span>
                          <span>{formatDurationHuman(s.duration)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
