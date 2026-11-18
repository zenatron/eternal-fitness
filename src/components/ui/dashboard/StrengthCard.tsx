'use client';

import Link from 'next/link';
import { useInsights } from '@/lib/hooks/useInsights';
import { useProfile } from '@/lib/hooks/useProfile';
import { FLAT_THRESHOLD } from '@/utils/strengthInsights';
import { Sparkline } from '@/components/insights/Sparkline';
import { ChangeText } from '@/components/insights/ChangeText';
import { DashboardCard } from './DashboardCard';

/**
 * Home-screen glance at strength: the three lifts moving most over the last
 * three months, and a line for anything stuck. The full list is one tap away
 * on Progress → Strength.
 *
 * Fetches on its own rather than through /api/dashboard, so the home screen's
 * main payload stays as cheap as it was and this tile fills in a moment later.
 */
export function StrengthCard() {
  const { data, isLoading, isError } = useInsights('90d');
  const { profile } = useProfile();
  const unit = profile?.useMetric ? 'kg' : 'lbs';

  const trends = data?.exercises.filter((t) => t.change !== null) ?? [];
  const top = [...trends].sort((a, b) => (b.change ?? 0) - (a.change ?? 0)).slice(0, 3);
  const stalled = (data?.exercises ?? []).filter((t) => t.stalled);

  return (
    <DashboardCard title="Strength" action={{ href: '/progress?view=strength', label: 'All lifts' }} className="h-full">
      {isLoading ? (
        <div className="h-24 animate-pulse rounded-lg bg-black/[0.04] dark:bg-white/[0.04]" aria-label="Loading" />
      ) : isError ? (
        <p className="py-4 text-sm text-surface-500 dark:text-surface-600">Couldn&apos;t load strength trends.</p>
      ) : top.length === 0 ? (
        <p className="py-4 text-sm text-surface-500 dark:text-surface-600">
          Log a lift three times and its trend shows up here.
        </p>
      ) : (
        <>
          <ul className="row-list">
            {top.map((t) => (
              <li key={t.key}>
                <Link
                  href={`/exercise/${encodeURIComponent(t.name)}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-surface-50 dark:text-white">{t.name}</span>
                    <span className="text-xs text-surface-500 dark:text-surface-600 tabular">
                      {Math.round(t.start)} → {Math.round(t.current)} {unit}
                    </span>
                  </span>
                  <Sparkline values={t.points.map((p) => p.e1rm)} width={56} height={24} />
                  <ChangeText percent={(t.change ?? 0) * 100} flatBand={FLAT_THRESHOLD * 100} className="w-10 text-right" />
                </Link>
              </li>
            ))}
          </ul>
          {stalled.length > 0 && (
            <p className="mt-3 border-t border-black/[0.06] pt-3 text-xs text-warning-700 dark:border-white/[0.06] dark:text-warning-400">
              No new best lately: {stalled.map((t) => t.name).join(', ')}
            </p>
          )}
        </>
      )}
    </DashboardCard>
  );
}
