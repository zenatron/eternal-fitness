'use client';

import { motion } from 'framer-motion';
import { getLevel, getLevelProgress, getLevelTitle } from '@/utils/levels';

interface LevelBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showTitle?: boolean;
  className?: string;
}

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };

const sizeClasses = {
  sm: {
    container: 'px-2.5 py-1 gap-1.5 text-xs',
    level: 'text-sm',
    bar: 'h-1',
  },
  md: {
    container: 'px-3 py-1.5 gap-2 text-sm',
    level: 'text-lg',
    bar: 'h-1.5',
  },
  lg: {
    container: 'px-4 py-2.5 gap-3',
    level: 'text-2xl',
    bar: 'h-2',
  },
};

export default function LevelBadge({ points, size = 'md', showProgress = true, showTitle = true, className = '' }: LevelBadgeProps) {
  const level = getLevel(points);
  const progress = getLevelProgress(points);
  const title = getLevelTitle(level);
  const s = sizeClasses[size];

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springSnappy}
      className={`inline-flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-forge-500 via-orange-500 to-amber-500 text-white font-display shadow-lg shadow-forge-500/20 ${s.container} ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`font-black tracking-tighter leading-none ${s.level}`}>
          {level}
        </span>
        {showTitle && (
          <span className="font-semibold uppercase tracking-wider leading-tight text-forge-100 opacity-90">
            {title}
          </span>
        )}
      </div>
      {showProgress && (
        <div className={`w-16 rounded-full bg-white/20 overflow-hidden ${s.bar}`}>
          <motion.div
            className="h-full rounded-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      )}
    </motion.div>
  );
}
