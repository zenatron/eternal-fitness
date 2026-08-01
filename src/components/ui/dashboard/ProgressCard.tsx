import { ChartBarIcon } from '@heroicons/react/24/outline';
import { ProgressData } from '@/types/dashboard';
import { motion, useReducedMotion } from 'framer-motion';
import { DashboardCard } from './DashboardCard';

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
    <DashboardCard title="Progress" icon={<ChartBarIcon className="w-5 h-5" />} className="h-full">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-950 dark:bg-surface-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-display font-bold text-surface-50 dark:text-white">
              <AnimatedNumber value={data.workoutsCompleted} />
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-600 mt-0.5 font-display tracking-wide uppercase">
              sessions
            </p>
          </div>
          <div className="bg-surface-950 dark:bg-surface-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-display font-bold text-surface-50 dark:text-white">
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
            <span className="text-sm font-display font-bold text-surface-50 dark:text-white">
              {data.weightProgress.current}
              {data.weightProgress.unit}
            </span>
          </div>
          <div
            className="h-2 bg-surface-900 dark:bg-surface-400 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={data.weightProgress.percentage ?? undefined}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress toward weight goal"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                data.weightProgress.reached ? 'bg-success-500' : 'bg-accent-500'
              }`}
              style={{
                width: `${data.weightProgress.percentage ?? 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-surface-500 mt-1.5">
            {data.weightProgress.reached ? (
              <>Goal reached — {data.weightProgress.goal}{data.weightProgress.unit}</>
            ) : data.weightProgress.percentage === null ? (
              // No baseline recorded yet, so a percentage would be fabricated.
              <>
                {data.weightProgress.remaining.toFixed(1)}
                {data.weightProgress.unit} to{' '}
                {data.weightProgress.direction === 'lose' ? 'lose' : 'gain'}
              </>
            ) : (
              <>
                {data.weightProgress.percentage}% there —{' '}
                {data.weightProgress.remaining.toFixed(1)}
                {data.weightProgress.unit} to go
              </>
            )}
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}
