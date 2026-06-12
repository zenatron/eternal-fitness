'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import pkg from '../../package.json';

export function Footer() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.footer
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
      className="relative z-10 border-t border-surface-200/60 dark:border-surface-300/40 bg-white/80 dark:bg-surface-50/80 backdrop-blur-sm py-6"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-surface-500 dark:text-surface-600">
        <p className="font-display tracking-wide">
          &copy; {new Date().getFullYear()} ETERNAL FITNESS
        </p>
        <p className="flex items-center gap-2">
          <span>Built by</span>
          <Link
            href="https://github.com/zenatron"
            className="text-forge-600 dark:text-forge-400 hover:underline transition-colors font-semibold"
          >
            zenatron
          </Link>
          <span className="text-surface-300 dark:text-surface-500">|</span>
          <motion.span
            className="font-mono text-xs text-forge-500/60"
            whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            v{pkg.version}
          </motion.span>
        </p>
      </div>
    </motion.footer>
  );
}
