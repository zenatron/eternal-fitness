import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { StatsData } from '@/types/dashboard';
import { formatVolume } from '@/utils/formatters';
import { motion, useReducedMotion } from 'framer-motion';

interface StatsCardProps {
  data: StatsData;
}

const statDefs = [
  { label: 'Workouts', value: (d: StatsData) => d.totalWorkouts.toLocaleString() },
  { label: 'Hours', value: (d: StatsData) => `${d.hoursTrained.toFixed(1)}h` },
  { label: 'Volume', value: (d: StatsData) => formatVolume(d.totalVolume.amount, d.totalVolume.unit === 'kg') },
  { label: 'Active Weeks', value: (d: StatsData) => String(d.activeWeeks) },
];

function AnimatedStatValue({ value }: { value: string }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.p
      className="text-lg font-display font-bold text-surface-800 dark:text-white mt-0.5"
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {value}
    </motion.p>
  );
}

export function StatsCard({ data }: StatsCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="forge-card heat-glow h-full">
      <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-300">
        <h3 className="font-display font-bold text-surface-800 dark:text-white tracking-wide uppercase text-sm">
          Your Stats
        </h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {statDefs.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-950 dark:bg-surface-200 rounded-lg p-3"
            >
              <p className="text-xs text-surface-500 dark:text-surface-600 font-display tracking-wide uppercase">
                {stat.label}
              </p>
              <AnimatedStatValue value={stat.value(data)} />
            </div>
          ))}
        </div>

        <div className="bg-surface-950 dark:bg-surface-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-surface-500 dark:text-surface-700">
              Volume vs last month
            </span>
            <motion.span
              className="text-sm font-display font-bold text-forge-500"
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.5 }}
              whileInView={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
            >
              +{data.totalVolume.percentIncrease}%
            </motion.span>
          </div>
          <div className="h-2 bg-surface-200 dark:bg-surface-400 rounded-full overflow-hidden">
            <div
              className="h-full bg-forge-500 rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.min(data.totalVolume.percentIncrease * 2, 100)}%`,
              }}
            />
          </div>
        </div>

        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-sm font-display font-semibold tracking-wide uppercase text-forge-600 dark:text-forge-400 hover:text-forge-700 dark:hover:text-forge-300 transition-colors"
        >
          View Full Stats
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
