'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  HomeIcon,
  RectangleStackIcon,
  PlusCircleIcon,
  ChartBarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolid,
  RectangleStackIcon as StackSolid,
  ChartBarIcon as ChartSolid,
  UserCircleIcon as UserSolid,
} from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';

/**
 * Thumb-reachable navigation for the installed app.
 *
 * Every destination previously lived behind the hamburger menu, which on a
 * phone means two taps and a reach to the top corner for something you do
 * constantly. This is mobile-only; the header nav already covers desktop.
 *
 * Logging a workout is the centre item and visually distinct because it is the
 * one thing the app exists to do — the rest are navigation.
 */

const ITEMS = [
  { href: '/', label: 'Home', icon: HomeIcon, activeIcon: HomeSolid },
  {
    href: '/templates',
    label: 'Workouts',
    icon: RectangleStackIcon,
    activeIcon: StackSolid,
  },
  { href: '/session/log', label: 'Log', icon: PlusCircleIcon, activeIcon: PlusCircleIcon, primary: true },
  { href: '/progress', label: 'Progress', icon: ChartBarIcon, activeIcon: ChartSolid },
  { href: '/profile', label: 'Profile', icon: UserCircleIcon, activeIcon: UserSolid },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const prefersReducedMotion = useReducedMotion();

  // Nothing to navigate to while signed out, and it would cover the login form.
  if (status !== 'authenticated') return null;

  return (
    <nav
      aria-label="Primary"
      /*
       * Dark background is surface-100, not surface-50. The page behind is
       * surface-0 (#0a0a09) and surface-50 is #111110 — near enough that the
       * bar, and especially its safe-area strip, read as dead black space
       * rather than as a distinct surface. surface-100 is visibly a bar.
       */
      className="fixed inset-x-0 z-40 border-t border-surface-200/80 bg-white backdrop-blur-md dark:border-surface-300/60 dark:bg-surface-100 md:hidden px-safe"
      style={{
        // Pulled below the viewport and padded back up by the same amount: the
        // bar sits exactly where bottom:0 would put it, but its background
        // continues past the edge so nothing can show through underneath.
        bottom: 'calc(-1 * var(--nav-bleed))',
        // --nav-safe-bottom, not the raw inset: padding the full
        // safe-area-inset-bottom lifted the bar a visible 34px off the screen
        // edge in the installed app, with the bleed painting the gap in the
        // bar's own colour so it looked like unexplained bottom padding.
        paddingBottom: 'calc(var(--nav-bleed) + var(--nav-safe-bottom))',
      }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {ITEMS.map((item) => {
          // Exact match for the dashboard, prefix match elsewhere, so
          // /templates and /template/create both light the Workouts tab.
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href) ||
                (item.href === '/templates' && pathname.startsWith('/template'));

          const Icon = isActive ? item.activeIcon : item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                // Fixed 3.25rem rather than a min-height plus padding: the
                // content was overshooting the 3.5rem minimum by a few pixels,
                // making the bar taller than intended on top of the safe-area
                // inset it already has to carry.
                className="tap-control flex h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1"
              >
                <motion.span
                  whileTap={prefersReducedMotion ? {} : { scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={
                    'primary' in item && item.primary
                      ? 'flex h-7 w-7 items-center justify-center rounded-full bg-accent-500 text-white shadow-sm shadow-accent-500/30'
                      : ''
                  }
                >
                  <Icon
                    className={
                      'primary' in item && item.primary
                        ? 'h-[1.15rem] w-[1.15rem]'
                        : `h-5 w-5 ${
                            isActive
                              ? 'text-accent-500 dark:text-accent-400'
                              : 'text-surface-500 dark:text-surface-700'
                          }`
                    }
                  />
                </motion.span>
                <span
                  className={`text-[10px] font-display uppercase tracking-wide ${
                    isActive
                      ? 'text-accent-600 dark:text-accent-400'
                      : 'text-surface-500 dark:text-surface-700'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
