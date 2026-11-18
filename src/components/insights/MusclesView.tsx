'use client';

import { useMemo } from 'react';
import type { InsightsResponse } from '@/lib/hooks/useInsights';
import { BODY_REGIONS, REGION_META, type BodyRegion } from '@/lib/muscleRegions';
import { FLAT_THRESHOLD } from '@/utils/strengthInsights';
import { DashboardCard } from '@/components/ui/dashboard/DashboardCard';
import { Sparkline } from './Sparkline';
import { ChangeText } from './ChangeText';

/**
 * Hard sets per muscle per week often cited as productive for growth. Shown as
 * a band, not a target to hit: it is a population guideline, and this app's
 * "effective sets" are an estimate on top of that.
 */
const BAND_LOW = 10;
const BAND_HIGH = 20;
/** Right edge of the bar scale. Anything past it is drawn full. */
const SCALE_MAX = 25;

/**
 * "Where am I getting stronger, and is each muscle getting enough work?"
 *
 * Two lists of the same muscles, because they answer different questions: the
 * first is outcome (strength), the second is input (volume). Seeing a muscle
 * flat on the first and under the band on the second is the useful pairing.
 */
export function MusclesView({ data }: { data: InsightsResponse }) {
  const withStrength = data.regions.filter((r) => r.exercises.length > 0);

  // Every region, so a muscle you never train shows up as zero instead of
  // being missing — the gap is the insight.
  const volume = useMemo(() => {
    const byRegion = new Map(data.regions.map((r) => [r.region, r]));
    return BODY_REGIONS.map((region: BodyRegion) => ({
      region,
      label: REGION_META[region].label,
      sets: byRegion.get(region)?.recentSetsPerWeek ?? 0,
    })).sort((a, b) => b.sets - a.sets);
  }, [data.regions]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <DashboardCard title="Strength by muscle">
        {withStrength.length === 0 ? (
          <p className="py-4 text-sm text-surface-500 dark:text-surface-600">
            Train a lift at least twice in this period to see its muscle here.
          </p>
        ) : (
          <>
            <p className="-mt-1 mb-2 text-xs text-surface-500 dark:text-surface-600">
              Each lift against its own starting point, averaged for the muscle it mainly works.
            </p>
            <ul className="row-list">
              {withStrength.map((r) => (
                <li key={r.region} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-surface-50 dark:text-white">{r.label}</p>
                    <p className="truncate text-xs text-surface-500 dark:text-surface-600">{r.exercises.join(', ')}</p>
                  </div>
                  <Sparkline
                    values={r.index.map((w) => w.value)}
                    baseline={1}
                    label={`${r.label} strength over the period`}
                  />
                  <div className="w-12 shrink-0 text-right">
                    {r.change === null ? (
                      <span className="text-xs text-surface-500 dark:text-surface-600">New</span>
                    ) : (
                      <ChangeText percent={r.change * 100} flatBand={FLAT_THRESHOLD * 100} className="!text-sm" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </DashboardCard>

      <DashboardCard title="Weekly sets">
        <p className="-mt-1 mb-3 text-xs text-surface-500 dark:text-surface-600">
          Hard sets a week, last four weeks. The shaded band is the {BAND_LOW}–{BAND_HIGH} sets often
          suggested for growth — a guide, not a rule.
        </p>
        <ul className="space-y-2.5">
          {volume.map((v) => {
            const pct = Math.min(100, (v.sets / SCALE_MAX) * 100);
            const status = v.sets === 0 ? 'none' : v.sets < BAND_LOW ? 'low' : v.sets > BAND_HIGH ? 'high' : 'in';
            return (
              <li key={v.region} className="grid grid-cols-[6rem_1fr_2.75rem] items-center gap-3">
                <span
                  className={`truncate text-sm ${
                    status === 'none' ? 'text-surface-500 dark:text-surface-600' : 'text-surface-50 dark:text-white'
                  }`}
                >
                  {v.label}
                </span>
                <span className="relative h-2 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
                  <span
                    className="absolute inset-y-0 bg-black/[0.07] dark:bg-white/[0.08]"
                    style={{ left: `${(BAND_LOW / SCALE_MAX) * 100}%`, width: `${((BAND_HIGH - BAND_LOW) / SCALE_MAX) * 100}%` }}
                    aria-hidden="true"
                  />
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${status === 'in' ? 'bg-accent-500' : 'bg-accent-500/50'}`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="figure text-right text-sm">{v.sets === 0 ? '—' : v.sets.toFixed(v.sets < 10 ? 1 : 0)}</span>
              </li>
            );
          })}
        </ul>
      </DashboardCard>
    </div>
  );
}
