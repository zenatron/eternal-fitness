import { FireIcon } from '@heroicons/react/24/outline';
import { ActivityDay } from '@/types/dashboard';
import { motion, useReducedMotion } from 'framer-motion';
import { DashboardCard } from './DashboardCard';

interface StreakCardProps {
  streak: number;
  activityData: ActivityDay[];
}

export function StreakCard({ streak, activityData }: StreakCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const completedDays = activityData.filter((d) => d.completed).length;
  const totalDays = activityData.length;
  const rate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  const icon = (
    <motion.div
      animate={
        prefersReducedMotion
          ? {}
          : streak > 0
          ? {
              rotate: [0, -5, 5, -5, 0],
              scale: [1, 1.15, 1],
            }
          : {}
      }
      transition={{
        duration: 0.6,
        repeat: streak > 0 ? Infinity : 0,
        repeatDelay: 3,
      }}
    >
      <FireIcon className="w-5 h-5 text-accent-500" />
    </motion.div>
  );

  return (
    <DashboardCard title="Current Streak" icon={icon} className="h-full">
      <div className="text-center mb-5">
        <motion.span
          className="text-5xl font-display font-black text-accent-500 block"
          initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
          whileInView={prefersReducedMotion ? {} : { scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {streak}
        </motion.span>
        <p className="text-sm text-surface-500 dark:text-surface-600 mt-1 font-display tracking-wide uppercase">
          {streak === 1 ? 'day streak' : 'days streak'}
        </p>
      </div>

      <div className="bg-surface-950 dark:bg-surface-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-display font-semibold text-surface-500 dark:text-surface-700 tracking-wide uppercase">
            Last 4 Weeks
          </span>
          <span className="text-xs text-surface-500 font-semibold">
            {rate.toFixed(0)}% active
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {activityData.slice(-28).map((day, i) => (
            <motion.div
              key={i}
              initial={prefersReducedMotion ? {} : { scale: 0 }}
              whileInView={prefersReducedMotion ? {} : { scale: 1 }}
              viewport={{ once: true }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 20,
                delay: i * 0.015,
              }}
              // The inactive swatch was `bg-surface-200`, which on the
              // inverted surface scale is near-black — so in light mode the
              // whole heatmap rendered as solid black squares.
              className={`h-6 w-full rounded ${
                day.completed
                  ? 'bg-accent-500'
                  : 'bg-surface-900 dark:bg-surface-400'
              }`}
              title={day.date}
              aria-label={`${day.date}: ${day.completed ? 'trained' : 'rest day'}`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-surface-500 dark:text-surface-600">
          <span>4 weeks ago</span>
          <span>Today</span>
        </div>
      </div>
    </DashboardCard>
  );
}
