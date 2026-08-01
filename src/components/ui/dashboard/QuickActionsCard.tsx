import {
  PlusIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  ClockIcon,
  TrophyIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { DashboardCard } from './DashboardCard';

const actions = [
  { href: '/template/create', label: 'New Template', icon: PlusIcon },
  { href: '/session/log', label: 'Log Workout', icon: ClockIcon },
  { href: '/recovery', label: 'Recovery', icon: HeartIcon },
  { href: '/templates', label: 'Templates', icon: ClipboardDocumentListIcon },
  { href: '/leaderboard', label: 'Leaderboard', icon: TrophyIcon },
  { href: '/profile', label: 'Profile', icon: UserIcon },
];

const springTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
};

export function QuickActionsCard() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <DashboardCard title="Quick Actions" className="h-full">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <motion.div
            key={action.href}
            whileHover={
              prefersReducedMotion ? {} : { scale: 1.04 }
            }
            whileTap={prefersReducedMotion ? {} : { scale: 0.96 }}
            transition={springTransition}
          >
            <Link
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border border-surface-200 dark:border-surface-400 hover:bg-surface-950 dark:hover:bg-surface-200 hover:border-accent-400/40 dark:hover:border-accent-500/40 transition-all text-center"
            >
              <action.icon className="w-5 h-5 text-surface-500 dark:text-surface-700" />
              <span className="text-xs font-display font-semibold tracking-wide uppercase text-surface-600 dark:text-surface-800">
                {action.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </DashboardCard>
  );
}
