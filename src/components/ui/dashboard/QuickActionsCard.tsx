import {
  PlusIcon,
  ClockIcon,
  TrophyIcon,
  HeartIcon,
  ListBulletIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
import { DashboardCard } from './DashboardCard';

// History replaces the Templates shortcut here: templates are already one tap
// away in the bottom nav, while history previously had no surface at all.
const actions = [
  { href: '/history', label: 'Workout history', icon: ListBulletIcon },
  { href: '/recovery', label: 'Recovery map', icon: HeartIcon },
  { href: '/session/log', label: 'Log a past workout', icon: ClockIcon },
  { href: '/template/create', label: 'New template', icon: PlusIcon },
  { href: '/leaderboard', label: 'Leaderboard', icon: TrophyIcon },
  { href: '/profile', label: 'Profile', icon: UserIcon },
];

/** A plain list of destinations: label first, so it scans like a menu. */
export function QuickActionsCard() {
  return (
    <DashboardCard title="Go to" className="h-full">
      <ul className="-mx-2 -my-1">
        {actions.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-2 text-sm text-surface-100 transition-colors hover:bg-black/[0.04] dark:text-surface-950 dark:hover:bg-white/[0.04]"
            >
              <action.icon className="h-[18px] w-[18px] shrink-0 text-surface-500 dark:text-surface-600" />
              <span className="flex-1">{action.label}</span>
              <ChevronRightIcon className="h-4 w-4 text-surface-600 dark:text-surface-500" />
            </Link>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
