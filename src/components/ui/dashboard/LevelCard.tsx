'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { getLevelProgress, getLevelTitle } from '@/utils/levels';
import LevelBadge from '@/components/ui/LevelBadge';

interface LevelCardProps {
  totalPoints: number;
}

const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };

export default function LevelCard({ totalPoints }: LevelCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const progress = getLevelProgress(totalPoints);
  const nextLevel = progress.currentLevel + 1;
  const title = getLevelTitle(progress.currentLevel);

  return (
    <div className="forge-card p-6 h-full flex flex-col items-center justify-center text-center">
      <motion.div
        initial={prefersReducedMotion ? {} : { scale: 0 }}
        animate={prefersReducedMotion ? {} : { scale: 1 }}
        transition={{ ...springBouncy, delay: 0.1 }}
        className="mb-3"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-400 via-accent-500 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/20 mx-auto">
          <span className="text-2xl font-display font-black text-white">
            {progress.currentLevel}
          </span>
        </div>
      </motion.div>

      <h3 className="text-lg font-display font-bold text-surface-50 dark:text-white mb-1">
        Level {progress.currentLevel}
      </h3>
      <p className="text-xs text-surface-500 dark:text-surface-600 font-display uppercase tracking-wider mb-3">
        {title}
      </p>

      <div className="w-full max-w-xs space-y-1">
        <div className="flex justify-between text-xs text-surface-500 dark:text-surface-600 font-medium tabular-nums">
          <span>{totalPoints.toLocaleString()} XP</span>
          <span>{progress.nextLevelXP.toLocaleString()} XP</span>
        </div>
        <div className="h-2.5 rounded-full bg-surface-900 dark:bg-surface-300/40 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
        <p className="text-[10px] text-surface-500 dark:text-surface-600 font-display uppercase tracking-wider text-right">
          Level {nextLevel} — {progress.currentLevel === 100 ? 'MAX' : `${((progress.nextLevelXP - totalPoints)).toLocaleString()} XP to go`}
        </p>
      </div>
    </div>
  );
}
