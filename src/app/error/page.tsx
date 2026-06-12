'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

export default function ErrorPage() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex items-center justify-center min-h-screen app-bg px-4">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20, scale: 0.96 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
        transition={springGentle}
        className="w-full max-w-md"
      >
        <div className="forge-card p-8 text-center space-y-6">
          <motion.div
            className="mx-auto w-20 h-20 rounded-lg greeting-gradient flex items-center justify-center"
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
              className="text-2xl font-display font-bold text-surface-800 dark:text-white tracking-wide uppercase"
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
              An unexpected error occurred. Please try again or return home.
            </motion.p>
          </div>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center pt-2"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: 0.25 }}
          >
            <motion.button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              transition={springSnappy}
            >
              Try Again
            </motion.button>
            <Link href="/">
              <motion.div
                className="btn btn-tertiary"
                whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                transition={springSnappy}
              >
                Go Home
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
