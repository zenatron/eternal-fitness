'use client';

import { useRouter } from 'next/navigation';
import { queryKeys } from '@/lib/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeftIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import LevelBadge from '@/components/ui/LevelBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { springSnappy, springBouncy, springGentle } from '@/lib/motion';


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
 * Gold / silver / bronze. Deliberately NOT themed: a podium only reads as a
 * podium if the medals keep their own colours, so this and TIER_COLORS in
 * types/achievements.ts are the two sanctioned uses of raw palette values.
 */
const MEDAL_COLORS: Record<number, string> = {
  1: 'from-award-300 to-award-500',
  2: 'from-surface-800 to-surface-700',
  3: 'from-amber-600 to-amber-800',
};

export default function LeaderboardPage() {
  const router = useRouter();
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

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="app-bg py-8 px-4"
    >
      <div className="max-w-3xl mx-auto">
        <div className="forge-card overflow-hidden mb-6">
          <div className="relative px-8 py-8 text-white greeting-gradient">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative flex items-center gap-4">
              <motion.button
                onClick={() => router.back()}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                transition={springSnappy}
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </motion.button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-wide uppercase flex items-center gap-3">
                  <TrophyIcon className="w-8 h-8" />
                  Leaderboard
                </h1>
                <p className="text-accent-100 text-sm mt-1">
                  Top 50 by total XP
                </p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="forge-card p-12 text-center text-surface-500">Loading...</div>
        ) : isError ? (
          <ErrorState
            what="the leaderboard"
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        ) : entries.length === 0 ? (
          <div className="forge-card p-12 text-center text-surface-500">
            <TrophyIcon className="w-16 h-16 mx-auto mb-4 text-surface-400" />
            <p className="text-lg font-display font-medium">No entries yet</p>
            <p className="text-sm mt-2 text-surface-500">Complete workouts to appear on the leaderboard</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {top3.map((entry) => (
                <motion.div
                  key={entry.userId}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ ...springBouncy, delay: entry.rank * 0.1 }}
                  className={`forge-card p-4 text-center ${entry.isCurrentUser ? 'ring-2 ring-accent-500' : ''} ${entry.rank === 1 ? 'md:order-2 md:-mt-4 md:scale-105' : entry.rank === 2 ? 'md:order-1' : 'md:order-3'}`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${MEDAL_COLORS[entry.rank] || 'from-surface-300 to-surface-400'} flex items-center justify-center mx-auto mb-2`}>
                    <span className="text-white font-black text-lg">{entry.rank}</span>
                  </div>
                  <p className="font-display font-bold text-surface-50 dark:text-white text-sm truncate">
                    {entry.name}
                  </p>
                  <div className="flex justify-center mt-1">
                    <LevelBadge points={entry.points} size="sm" showTitle={false} />
                  </div>
                  <p className="text-xs text-surface-500 mt-1">
                    {entry.points.toLocaleString()} XP
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Rest of the list */}
            <div className="space-y-2">
              {rest.map((entry, i) => (
                <motion.div
                  key={entry.userId}
                  initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                  transition={{ ...springSnappy, delay: i * 0.03 }}
                  className={`forge-card p-4 flex items-center gap-4 ${entry.isCurrentUser ? 'ring-2 ring-accent-500 bg-accent-50/50 dark:bg-accent-900/10' : ''}`}
                >
                  <span className="w-8 text-center font-display font-bold text-surface-400 text-sm">
                    {entry.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-surface-50 dark:text-white text-sm truncate">
                      {entry.name}
                      {entry.isCurrentUser && (
                        <span className="ml-2 text-[10px] font-bold text-accent-500 uppercase">You</span>
                      )}
                    </p>
                    <p className="text-xs text-surface-500">{entry.totalWorkouts} workouts</p>
                  </div>
                  <LevelBadge points={entry.points} size="sm" showTitle={false} />
                  <p className="text-sm font-display font-bold text-surface-600 dark:text-surface-400 w-24 text-right tabular-nums">
                    {entry.points.toLocaleString()} XP
                  </p>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
