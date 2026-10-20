'use client';

import { getLevelProgress, getLevelTitle } from '@/utils/levels';
import { DashboardCard } from './DashboardCard';

interface LevelCardProps {
  totalPoints: number;
}

export default function LevelCard({ totalPoints }: LevelCardProps) {
  const progress = getLevelProgress(totalPoints);
  const title = getLevelTitle(progress.currentLevel);
  const toGo = Math.max(0, progress.nextLevelXP - totalPoints);

  return (
    <DashboardCard title="Level" action={{ href: '/leaderboard', label: 'Leaderboard' }} className="h-full">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-500 font-display text-xl font-semibold text-white tabular">
          {progress.currentLevel}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-surface-50 dark:text-white">{title}</p>
          <p className="text-xs text-surface-500 dark:text-surface-600 tabular">
            {totalPoints.toLocaleString()} XP
          </p>
        </div>
      </div>
      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress to level ${progress.currentLevel + 1}`}
      >
        <div className="h-full rounded-full bg-accent-500" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-600 tabular">
        {toGo.toLocaleString()} XP to level {progress.currentLevel + 1}
      </p>
    </DashboardCard>
  );
}
