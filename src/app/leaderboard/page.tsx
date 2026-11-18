'use client';

import { PageHeader } from '@/components/ui/PageHeader';

import { queryKeys } from '@/lib/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import {
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { springSnappy } from '@/lib/motion';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  points: number;
  level: number;
  totalWorkouts: number;
  isCurrentUser: boolean;
}

/*
 * Gold / silver / bronze, on the rank number only. Deliberately NOT themed: a
 * medal ladder only reads as one if the medals keep their own colours, so this
 * and TIER_COLORS in types/achievements.ts are the two sanctioned uses of
 * fixed palette values.
 */
const MEDAL_COLORS: Record<number, string> = {
  1: 'text-award-600 dark:text-award-400',
  2: 'text-surface-600 dark:text-surface-800',
  3: 'text-warning-700 dark:text-warning-600',
};

export default function LeaderboardPage() {
  const prefersReducedMotion = useReducedMotion();
  /*
   * A failed request used to fall through to the "No entries yet" empty state,
   * which reads as "nobody has trained" rather than "this didn't load".
   */
  const {
    data: entries = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<LeaderboardEntry[]>({
    queryKey: queryKeys.leaderboard,
    queryFn: async () => {
      const response = await fetch('/api/leaderboard', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Failed to load leaderboard');
      const data = await response.json();
      return data.leaderboard ?? [];
    },
    staleTime: 1000 * 60 * 2,
  });

  return (
    <div className="px-4 pb-16 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <PageHeader back title="Leaderboard" description="Everyone training here, ranked by XP" />

        {isLoading ? (
          <div className="forge-card p-10 text-center text-sm text-surface-500" role="status">Loading leaderboard…</div>
        ) : isError ? (
          <ErrorState
            what="the leaderboard"
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        ) : entries.length === 0 ? (
          <EmptyState icon={TrophyIcon} title="Nobody on the board yet" hint="Finish a workout to put yourself on it." />
        ) : (
          /*
           * One ranked list. This is a handful of friends, not a public ladder:
           * the old three-card podium plus a second list style split a group of
           * five into two layouts. Each bar is XP against the leader, so the
           * gap to the person above you is something you can see.
           */
          <ol className="forge-card row-list px-4 sm:px-5">
            {entries.map((entry, i) => {
              const leader = entries[0]?.points || 1;
              const share = Math.max(2, Math.round((entry.points / leader) * 100));
              return (
                <motion.li
                  key={entry.userId}
                  initial={prefersReducedMotion ? {} : { opacity: 0 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1 }}
                  transition={{ ...springSnappy, delay: prefersReducedMotion ? 0 : i * 0.03 }}
                  aria-current={entry.isCurrentUser ? 'true' : undefined}
                  className={`-mx-4 flex items-center gap-3 px-4 py-3.5 sm:-mx-5 sm:px-5 ${
                    entry.isCurrentUser ? 'bg-accent-500/[0.06]' : ''
                  }`}
                >
                  <span
                    className={`figure w-6 shrink-0 text-center text-lg ${MEDAL_COLORS[entry.rank] ?? '!text-surface-600 dark:!text-surface-600'}`}
                  >
                    {entry.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-surface-50 dark:text-white">
                        <span className="truncate">{entry.name}</span>
                        {entry.isCurrentUser && <span className="tag shrink-0">You</span>}
                      </p>
                      <p className="figure shrink-0 text-base">
                        {entry.points.toLocaleString()}
                        <span className="ml-1 font-body text-xs font-medium text-surface-500 dark:text-surface-600">XP</span>
                      </p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full ${entry.isCurrentUser ? 'bg-accent-500' : 'bg-surface-700 dark:bg-surface-600'}`}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <p className="shrink-0 text-xs text-surface-500 dark:text-surface-600 tabular">
                        Level {entry.level} · {entry.totalWorkouts} workout{entry.totalWorkouts === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
