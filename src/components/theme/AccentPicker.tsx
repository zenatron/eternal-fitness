'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/solid';
import { ACCENT_THEMES } from '@/types/theme';
import { useAccent } from './AccentProvider';

/**
 * Accent theme selector.
 *
 * Applies on tap with no save step — the whole page recolours instantly because
 * the change is one `data-accent` attribute, so a preview control would only be
 * showing what the real thing already shows.
 *
 * Rendered as a radiogroup rather than a row of buttons: these are five
 * mutually exclusive values of one setting, and that distinction matters to a
 * screen reader.
 */
export function AccentPicker() {
  const { accent, setAccent } = useAccent();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label="Accent theme"
      // Single column on a phone. Two columns fits five tiles in less height,
      // but a 32px swatch plus text in ~160px truncated every name to "ARCT…"
      // and every description to "Molten…", which defeats the point of having
      // them. Height is cheap inside a settings section; legibility is not.
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
    >
      {ACCENT_THEMES.map((theme) => {
        const isActive = accent === theme.id;
        return (
          <motion.button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setAccent(theme.id)}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`tap-control flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
              isActive
                ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                : 'border-surface-200 hover:border-surface-300 dark:border-surface-300 dark:hover:border-surface-400'
            }`}
          >
            {/*
             * Literal hex from the theme definition, not an `accent-*` class:
             * all five swatches are on screen at once, but --accent-* only ever
             * holds the active theme's value.
             */}
            <span
              aria-hidden="true"
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.swatch }}
            >
              {isActive && <CheckIcon className="h-5 w-5 text-white drop-shadow" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-bold uppercase tracking-wide text-surface-50 dark:text-white">
                {theme.name}
              </span>
              <span className="block truncate text-xs text-surface-500 dark:text-surface-600">
                {theme.description}
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
