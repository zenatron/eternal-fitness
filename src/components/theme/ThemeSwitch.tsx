'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export default function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg text-surface-500 dark:text-surface-700 hover:bg-surface-900 dark:hover:bg-surface-200 transition-colors relative"
      whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={
            prefersReducedMotion
              ? {}
              : { rotate: -90, opacity: 0, scale: 0.5 }
          }
          animate={
            prefersReducedMotion
              ? {}
              : { rotate: 0, opacity: 1, scale: 1 }
          }
          exit={
            prefersReducedMotion
              ? {}
              : { rotate: 90, opacity: 0, scale: 0.5 }
          }
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {isDark ? (
            <MoonIcon className="w-5 h-5" />
          ) : (
            <SunIcon className="w-5 h-5" />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
