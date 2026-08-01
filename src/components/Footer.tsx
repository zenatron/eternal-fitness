'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import pkg from '../../package.json';
import { DEBUG_KEY, DEBUG_EVENT } from './pwa/SafeAreaDebug';

/** Taps on the version needed to reveal the safe-area readout. */
const DEBUG_TAPS = 7;

export function Footer() {
  const prefersReducedMotion = useReducedMotion();
  const taps = useRef(0);

  // The installed app has no URL bar, so ?debug= is unreachable exactly where
  // the layout bug reproduces. Tapping the build number is the standard escape
  // hatch for that, and costs no settings UI. Remove with SafeAreaDebug.
  const handleVersionTap = () => {
    taps.current += 1;
    if (taps.current < DEBUG_TAPS) {
      // Only hint near the end, so an accidental double-tap stays silent.
      if (taps.current >= DEBUG_TAPS - 3) {
        toast(`${DEBUG_TAPS - taps.current} more…`, { duration: 800 });
      }
      return;
    }
    taps.current = 0;
    localStorage.setItem(DEBUG_KEY, '1');
    window.dispatchEvent(new Event(DEBUG_EVENT));
    toast.success('Safe-area readout enabled');
  };

  return (
    <motion.footer
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
      style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}
      className="relative z-10 border-t border-surface-200/60 dark:border-surface-300/40 bg-white/80 dark:bg-surface-50/80 backdrop-blur-sm px-safe pt-6"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-surface-500 dark:text-surface-600">
        <p className="font-display tracking-wide">
          &copy; {new Date().getFullYear()} ETERNAL FITNESS
        </p>
        <p className="flex items-center gap-2">
          <span>Built by</span>
          <Link
            href="https://github.com/zenatron"
            className="text-accent-600 dark:text-accent-400 hover:underline transition-colors font-semibold"
          >
            zenatron
          </Link>
          <span className="text-surface-300 dark:text-surface-500">|</span>
          <motion.button
            type="button"
            onClick={handleVersionTap}
            className="tap-control font-mono text-xs text-accent-500/60"
            whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            v{pkg.version}
          </motion.button>
        </p>
      </div>
    </motion.footer>
  );
}
