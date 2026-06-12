'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { signIn } from 'next-auth/react';

const devBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === 'true';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

const staggerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...springGentle, delay: i * 0.07 },
  }),
};

export default function LoginPage() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={springGentle}
        className="w-full max-w-sm"
      >
        <div className="forge-card p-8">
          <motion.div
            className="text-center mb-8"
            initial={prefersReducedMotion ? 'hidden' : 'hidden'}
            animate={prefersReducedMotion ? 'visible' : 'visible'}
            variants={prefersReducedMotion ? {} : {
              visible: { transition: { staggerChildren: 0.07 } },
            }}
          >
            <motion.div
              className="w-14 h-14 mx-auto mb-4 rounded-lg greeting-gradient flex items-center justify-center"
              variants={prefersReducedMotion ? {} : staggerVariants}
              custom={0}
              animate={
                prefersReducedMotion
                  ? {}
                  : { scale: [1, 1.05, 1] }
              }
              transition={
                prefersReducedMotion
                  ? {}
                  : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </motion.div>

            <motion.h1
              className="text-3xl font-display font-bold text-surface-800 dark:text-white mb-1 tracking-wide"
              variants={prefersReducedMotion ? {} : staggerVariants}
              custom={1}
            >
              ETERNAL FITNESS
            </motion.h1>

            <motion.p
              className="text-sm text-surface-500 dark:text-surface-600"
              variants={prefersReducedMotion ? {} : staggerVariants}
              custom={2}
            >
              Sign in to continue your fitness journey
            </motion.p>
          </motion.div>

          <motion.div
            className="space-y-3"
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
            transition={{ ...springGentle, delay: 0.15 }}
          >
            <motion.button
              onClick={() => signIn('pocketid')}
              className="btn btn-primary w-full !py-3"
              whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              transition={springSnappy}
              style={{ boxShadow: '0 0 15px rgba(237, 123, 22, 0.2)' }}
            >
              Sign in with PocketID
            </motion.button>

            {devBypassEnabled && (
              <motion.button
                onClick={() => signIn('dev-bypass', { email: 'dev@eternal-fitness.local' })}
                className="w-full px-5 py-3 border-2 border-dashed border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-400 font-display font-semibold tracking-wide uppercase rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:focus:ring-offset-surface-0"
                whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                transition={springSnappy}
              >
                Dev Sign In
              </motion.button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
