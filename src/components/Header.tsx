'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeSwitch from './theme/ThemeSwitch';
import { useState, useRef, useEffect } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import {
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const navLinks = [
  { href: '/templates', label: 'Templates' },
  { href: '/profile', label: 'Profile' },
];

const springTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

const springBouncy = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 20,
};

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { data: session } = useSession();
  const prefersReducedMotion = useReducedMotion();
  const headerRef = useRef<HTMLDivElement>(null);

  /*
   * The shrink-on-scroll effect is gone: it was driven by `window.scrollY`, and
   * the window no longer scrolls now that AppShell owns a single inner scroll
   * container. Rather than plumb the container ref through just to shrink the
   * bar by 12px, the header is a fixed 4rem — which is the conventional
   * behaviour for an installed app and one less thing to desynchronise.
   */

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const initial =
    session?.user?.name?.charAt(0)?.toUpperCase() ||
    session?.user?.email?.charAt(0)?.toUpperCase() ||
    '?';

  return (
    <motion.header
      ref={headerRef}
      style={{ height: '4rem' }}
      // Sticky positioning, the safe-area inset and hide-on-scroll all live on
      // AppChrome now, so this is just the bar itself.
      className="border-b border-surface-200/80 dark:border-surface-300/50 bg-white/95 dark:bg-surface-50/95 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <motion.div
            className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center relative overflow-hidden"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
          >
            <motion.svg
              className="w-5 h-5 text-white relative z-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              animate={
                prefersReducedMotion
                  ? {}
                  : { rotate: [0, 0, 0] }
              }
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        pathLength: [0.85, 1, 0.85],
                        transition: {
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        },
                      }
                }
              />
            </motion.svg>
            {!prefersReducedMotion && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-accent-400/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0, 0.3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </motion.div>
          <motion.span
            className="text-lg font-display font-bold text-surface-50 dark:text-white origin-left tracking-wide"
          >
            ETERNAL FITNESS
          </motion.span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {session &&
            navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-3 py-2 text-sm font-display font-semibold tracking-wide uppercase rounded-lg transition-colors"
                >
                  <span
                    className={
                      isActive
                        ? 'text-accent-500 dark:text-accent-400'
                        : 'text-surface-500 dark:text-surface-700 hover:text-surface-800 dark:hover:text-white'
                    }
                  >
                    {link.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-accent-50 dark:bg-accent-950/40 rounded-lg -z-10"
                      transition={springTransition}
                    />
                  )}
                </Link>
              );
            })}

          {session && (
            <div className="relative ml-2">
              <motion.button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-surface-200 dark:border-surface-400 hover:bg-surface-900 dark:hover:bg-surface-200 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springTransition}
              >
                <motion.span
                  className="w-7 h-7 rounded-full bg-accent-500 flex items-center justify-center text-white text-xs font-display font-bold"
                  style={
                    prefersReducedMotion
                      ? undefined
                      : { animation: 'pulse-glow 2s ease-out infinite' }
                  }
                >
                  {initial}
                </motion.span>
                <span className="text-sm text-surface-600 dark:text-surface-800 hidden lg:block max-w-[120px] truncate">
                  {session.user?.name || session.user?.email}
                </span>
              </motion.button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={springBouncy}
                      className="absolute right-0 top-full mt-2 w-56 forge-card shadow-lg z-20 py-1 overflow-hidden origin-top-right"
                    >
                      <div className="px-4 py-2.5 border-b border-surface-100 dark:border-surface-300">
                        <p className="text-sm font-semibold text-surface-50 dark:text-white truncate">
                          {session.user?.name || session.user?.email}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-600 truncate">
                          {session.user?.email}
                        </p>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-600 dark:text-surface-800 hover:bg-surface-50 dark:hover:bg-surface-200 transition-colors"
                      >
                        <UserCircleIcon className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        href="/profile/edit"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-600 dark:text-surface-800 hover:bg-surface-50 dark:hover:bg-surface-200 transition-colors"
                      >
                        <Cog6ToothIcon className="w-4 h-4" />
                        Settings
                      </Link>
                      <div className="border-t border-surface-100 dark:border-surface-300 pt-1 mt-1">
                        <button
                          onClick={() => signOut({ callbackUrl: '/login' })}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-danger-500 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors w-full"
                        >
                          <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                          Sign Out
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

        {/* Mobile hamburger */}
        <motion.button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 -mr-2 rounded-lg text-surface-500 dark:text-surface-700 hover:bg-surface-900 dark:hover:bg-surface-200 transition-colors"
          whileTap={{ scale: 0.9 }}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <XMarkIcon className="w-5 h-5" />
          ) : (
            <Bars3Icon className="w-5 h-5" />
          )}
        </motion.button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="md:hidden border-t border-surface-200 dark:border-surface-300 bg-white dark:bg-surface-50 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {session &&
                navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2.5 text-sm font-display font-semibold tracking-wide uppercase text-surface-600 dark:text-surface-800 rounded-lg hover:bg-surface-900 dark:hover:bg-surface-200 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              <Link
                href="/profile/edit"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-display font-semibold tracking-wide uppercase text-surface-600 dark:text-surface-800 rounded-lg hover:bg-surface-900 dark:hover:bg-surface-200 transition-colors"
              >
                Settings
              </Link>
              {session && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut({ callbackUrl: '/login' });
                  }}
                  className="block w-full text-left px-3 py-2.5 text-sm font-display font-semibold tracking-wide uppercase text-danger-500 dark:text-danger-400 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors"
                >
                  Sign Out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
