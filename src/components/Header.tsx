'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeSwitch from './theme/ThemeSwitch';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import {
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

/**
 * Desktop navigation mirrors the mobile bottom nav. It used to list only
 * Templates and Profile — and the bottom nav is hidden from `md` up — so on a
 * laptop Progress, History and Log were reachable only through dashboard tiles.
 */
const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/templates', label: 'Workouts' },
  { href: '/session/log', label: 'Log' },
  { href: '/progress', label: 'Progress' },
  { href: '/history', label: 'History' },
];

/** Destinations the bottom nav has no room for, offered in the phone menu. */
const moreLinks = [
  { href: '/history', label: 'History' },
  { href: '/personal-records', label: 'Personal records' },
  { href: '/recovery', label: 'Recovery' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile/edit', label: 'Settings' },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/templates') return pathname.startsWith('/template');
  return pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { data: session } = useSession();

  /*
   * The bar is a fixed 4rem: the window does not scroll (AppShell owns a single
   * inner scroll container), so there is no scroll position to shrink against,
   * and a constant header is the conventional behaviour for an installed app.
   */

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Escape closes whichever menu is open — the standard dismissal keyboard
  // and screen-reader users expect from a disclosure menu.
  useEffect(() => {
    if (!menuOpen && !userMenuOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [menuOpen, userMenuOpen]);

  const initial =
    session?.user?.name?.charAt(0)?.toUpperCase() ||
    session?.user?.email?.charAt(0)?.toUpperCase() ||
    '?';

  const menuItemClass =
    'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-surface-300 transition-colors hover:bg-black/[0.04] dark:text-surface-900 dark:hover:bg-white/[0.05]';

  return (
    <header
      style={{ height: '4rem' }}
      className="border-b border-black/[0.08] bg-white/95 backdrop-blur-sm dark:border-white/[0.06] dark:bg-surface-50/95"
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* A still mark. It used to redraw its own bolt and pulse a halo
            forever, in the corner of every screen. */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Eternal Fitness home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-surface-50 dark:text-white">
            Eternal
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {session &&
            navLinks.map((link) => {
              const active = isActivePath(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-black/[0.05] text-surface-50 dark:bg-white/[0.07] dark:text-white'
                      : 'text-surface-500 hover:text-surface-50 dark:text-surface-700 dark:hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

          {session && (
            <div className="relative ml-3">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label="Account menu"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {initial}
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="forge-card absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden py-1 shadow-lg"
                      role="menu"
                    >
                      <div className="border-b border-black/[0.06] px-4 py-2.5 dark:border-white/[0.06]">
                        <p className="truncate text-sm font-semibold text-surface-50 dark:text-white">
                          {session.user?.name || session.user?.email}
                        </p>
                        <p className="truncate text-xs text-surface-500 dark:text-surface-600">{session.user?.email}</p>
                      </div>
                      <Link href="/profile" role="menuitem" className={menuItemClass}>
                        <UserCircleIcon className="h-4 w-4" />
                        Profile
                      </Link>
                      <Link href="/profile/edit" role="menuitem" className={menuItemClass}>
                        <Cog6ToothIcon className="h-4 w-4" />
                        Settings
                      </Link>
                      <div className="mt-1 border-t border-black/[0.06] pt-1 dark:border-white/[0.06]">
                        <button
                          role="menuitem"
                          onClick={() => signOut({ callbackUrl: '/login' })}
                          className={`${menuItemClass} !text-danger-600 dark:!text-danger-400`}
                        >
                          <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="ml-2">
            <ThemeSwitch />
          </div>
        </nav>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="touch-target -mr-2 flex items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-black/[0.04] dark:text-surface-700 dark:hover:bg-white/[0.05] md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          {menuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu: what the bottom nav has no room for. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-b border-black/[0.08] bg-white dark:border-white/[0.06] dark:bg-surface-50 md:hidden"
          >
            <div className="space-y-0.5 px-2 py-2">
              {session &&
                moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm text-surface-300 transition-colors hover:bg-black/[0.04] dark:text-surface-900 dark:hover:bg-white/[0.05]"
                  >
                    {link.label}
                  </Link>
                ))}
              {/* The desktop nav owns a ThemeSwitch; without one here the only
                  dark/light control in the app was unreachable on a phone. */}
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-sm text-surface-300 dark:text-surface-900">Theme</span>
                <ThemeSwitch />
              </div>
              {session && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut({ callbackUrl: '/login' });
                  }}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-danger-600 transition-colors hover:bg-danger-500/10 dark:text-danger-400"
                >
                  Sign out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
