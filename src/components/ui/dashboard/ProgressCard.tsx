import { ChartBarIcon } from '@heroicons/react/24/outline';
import { ProgressData } from '@/types/dashboard';
import { motion, useReducedMotion } from 'framer-motion';

interface ProgressCardProps {
  data: ProgressData;
}

function AnimatedNumber({ value }: { value: number }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.span
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
    >
      {value}
    </motion.span>
  );
}

export function ProgressCard({ data }: ProgressCardProps) {
  return (
    <div className="forge-card heat-glow h-full">
      <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-300 flex items-center justify-between">
        <h3 className="font-display font-bold text-surface-800 dark:text-white tracking-wide uppercase text-sm">
          Progress
        </h3>
        <ChartBarIcon className="w-5 h-5 text-forge-500/60" />
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-950 dark:bg-surface-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-display font-bold text-surface-800 dark:text-white">
              <AnimatedNumber value={data.workoutsCompleted} />
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-600 mt-0.5 font-display tracking-wide uppercase">
              sessions
            </p>
          </div>
          <div className="bg-surface-950 dark:bg-surface-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-display font-bold text-surface-800 dark:text-white">
              <AnimatedNumber value={data.personalRecords} />
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-600 mt-0.5 font-display tracking-wide uppercase">
              records
            </p>
          </div>
        </div>

        <div className="bg-surface-950 dark:bg-surface-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-surface-600 dark:text-surface-800">
              Weight Progress
            </span>
            <span className="text-sm font-display font-bold text-surface-800 dark:text-white">
              {data.weightProgress.current}
              {data.weightProgress.unit}
            </span>
          </div>
          <div className="h-2 bg-surface-200 dark:bg-surface-400 rounded-full overflow-hidden">
            <div
              className="h-full bg-forge-500 rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${data.weightProgress.percentage}%`,
              }}
            />
          </div>
          <p className="text-xs text-surface-500 mt-1.5">
            {data.weightProgress.percentage}% to goal of{' '}
            {data.weightProgress.goal}
            {data.weightProgress.unit}
          </p>
        </div>
      </div>
    </div>
  );
}
