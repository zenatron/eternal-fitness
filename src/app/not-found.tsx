'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { springSnappy, springBouncy, springGentle } from '@/lib/motion';


export default function NotFound() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center min-h-page app-bg">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 16, scale: 0.97 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
        transition={springGentle}
        className="w-full max-w-lg forge-card p-8 space-y-8 text-center"
      >
        <motion.h1
          className="text-8xl font-display font-black text-accent-500"
          initial={prefersReducedMotion ? {} : { scale: 0, rotate: -15 }}
          animate={prefersReducedMotion ? {} : { scale: 1, rotate: 0 }}
          transition={{ ...springBouncy, delay: 0.05 }}
        >
          404
        </motion.h1>

        <motion.div
          className="space-y-4"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.1 }}
        >
          <h2 className="text-3xl font-display font-bold text-surface-600 dark:text-surface-900 tracking-wide uppercase">
            Page Not Found
          </h2>
          <p className="text-xl text-surface-500 dark:text-surface-700">
            {"Sorry, we couldn't find the page you're looking for."}
          </p>
        </motion.div>

        <motion.div
          className="pt-6"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.15 }}
        >
          <Link href="/">
            <motion.div
              className="btn btn-primary inline-flex items-center space-x-2 text-lg px-6 py-3"
              whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              transition={springSnappy}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Return Home</span>
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
