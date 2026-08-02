import { CalendarDaysIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { WorkoutSession } from '@/types/workout';
import { dayKeyOf, formatCivilDayRelative } from '@/utils/datetime';
import { useTemplate } from '@/lib/hooks/useTemplate';
import { useProfile } from '@/lib/hooks/useProfile';
import { useTimeZone } from '@/lib/hooks/useTimeZone';
import { motion, useReducedMotion } from 'framer-motion';

const springTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
};

function SessionRow({ session, index }: { session: WorkoutSession; index: number }) {
  const { template } = useTemplate(session.workoutTemplateId);
  const { profile } = useProfile();
  const timeZone = useTimeZone();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        prefersReducedMotion ? {} : { opacity: 0, x: -12 }
      }
      whileInView={
        prefersReducedMotion ? {} : { opacity: 1, x: 0 }
      }
      viewport={{ once: true }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        delay: index * 0.06,
      }}
      className="flex items-center justify-between py-2"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-surface-50 dark:text-white truncate">
          {template?.name || 'Untitled'}
        </p>
        <p className="text-xs text-surface-500 dark:text-surface-600">
          {session.scheduledAt
            ? formatCivilDayRelative(dayKeyOf(session.scheduledAt, timeZone), timeZone)
            : 'Unscheduled'}
          {session.duration ? ` · ${session.duration}m` : ''}
          {template?.totalVolume != null
            ? ` · ${template.totalVolume}${profile?.useMetric ? 'kg' : 'lbs'}`
            : ''}
        </p>
      </div>
      <motion.div
        whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        transition={springTransition}
      >
        <Link
          href={`/session/active/${session.workoutTemplateId}?sessionId=${session.id}`}
          className="ml-3 px-3 py-1 text-xs font-display font-bold tracking-wide uppercase bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors shrink-0"
        >
          Start
        </Link>
      </motion.div>
    </motion.div>
  );
}

interface UpcomingWorkoutsCardProps {
  sessions: WorkoutSession[] | undefined;
}

export function UpcomingWorkoutsCard({
  sessions,
}: UpcomingWorkoutsCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="forge-card heat-glow h-full">
      <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-300 flex items-center justify-between">
        <h3 className="font-display font-bold text-surface-50 dark:text-white tracking-wide uppercase text-sm">
          Upcoming
        </h3>
        <CalendarDaysIcon className="w-5 h-5 text-accent-500/40" />
      </div>
      <div className="p-5">
        {Array.isArray(sessions) && sessions.length > 0 ? (
          <div className="divide-y divide-surface-100 dark:divide-surface-300">
            {sessions.map((s, i) => (
              <SessionRow key={s.id} session={s} index={i} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-surface-500 dark:text-surface-600 text-center py-6">
            No upcoming workouts scheduled
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <motion.div
            className="flex-1"
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            transition={springTransition}
          >
            <Link
              href="/template/create"
              className="block px-3 py-2 text-center text-sm font-display font-semibold tracking-wide uppercase border border-surface-300 dark:border-surface-400 text-surface-600 dark:text-surface-800 rounded-lg hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors"
            >
              Create
            </Link>
          </motion.div>
          <motion.div
            className="flex-1"
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            transition={springTransition}
          >
            <Link
              href="/templates"
              className="block px-3 py-2 text-center text-sm font-display font-bold tracking-wide uppercase bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                Browse
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
