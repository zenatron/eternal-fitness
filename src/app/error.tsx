'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { springSnappy, springBouncy, springGentle } from '@/lib/motion';

/**
 * Route-level error boundary. Render crashes used to fall through to Next's
 * default production screen, which looked nothing like the app and offered no
 * way back — this keeps the FORGE shell and adds a retry without a full reload.
 * (Network/data failures are handled per-page by `ErrorState`; this catches the
 * crashes those cannot.)
 */
export default function ErrorBoundaryPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  // Surfaced for debugging; production builds strip non-error console calls.
  console.error('Render error caught by boundary:', error);

  return (
    <div className="flex items-center justify-center min-h-page app-bg px-4">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20, scale: 0.96 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
        transition={springGentle}
        className="w-full max-w-md"
      >
        <div className="forge-card p-8 text-center space-y-6">
          <motion.div
            className="mx-auto w-20 h-20 rounded-lg bg-gradient-to-br from-danger-500 to-danger-700 flex items-center justify-center"
            initial={prefersReducedMotion ? {} : { scale: 0, rotate: -30 }}
            animate={prefersReducedMotion ? {} : { scale: 1, rotate: 0 }}
            transition={{ ...springBouncy, delay: 0.1 }}
          >
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </motion.div>

          <div className="space-y-2">
            <motion.h1
              className="text-2xl font-display font-bold text-surface-50 dark:text-white tracking-wide uppercase"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ ...springGentle, delay: 0.15 }}
            >
              Something went wrong
            </motion.h1>
            <motion.p
              className="text-surface-500 dark:text-surface-600"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ ...springGentle, delay: 0.2 }}
            >
              The screen hit an unexpected error. Your logged data is safe.
            </motion.p>
          </div>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: 0.25 }}
          >
            <button onClick={reset} className="btn btn-primary tap-control">
              Try again
            </button>
            <Link href="/" className="btn btn-tertiary tap-control">
              Back to dashboard
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
