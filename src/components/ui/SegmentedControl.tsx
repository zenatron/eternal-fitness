'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useId } from 'react';
import { springSnappy } from '@/lib/motion';

/**
 * A pick-one control for small, always-visible option sets.
 *
 * Replaces the unit-system toggle on the profile editor, which paired a
 * headless-ui `Switch` with a second row of buttons that set the same state. Two
 * controls for one value meant the switch could end up showing the opposite of
 * the selection, and a switch is the wrong shape for the question anyway: "metric
 * or imperial" is a choice between two named things, not something that is on or
 * off. Here the label you want is the thing you tap.
 *
 * Implemented as a radiogroup so arrow keys move the selection and screen
 * readers announce it as a choice rather than as N unrelated buttons.
 */

export interface SegmentedOption<T extends string | boolean> {
  value: T;
  label: string;
  /** Optional second line — units, an example, a consequence. */
  hint?: string;
}

interface SegmentedControlProps<T extends string | boolean> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export function SegmentedControl<T extends string | boolean>({
  options,
  value,
  onChange,
  label,
  className = '',
}: SegmentedControlProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const groupId = useId();

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    onChange(options[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-2 ${options.length > 2 ? 'grid-cols-3' : 'grid-cols-2'} ${className}`}
    >
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={`relative min-h-[52px] rounded-xl px-4 py-2.5 text-center transition-colors tap-control ${
              selected
                ? 'text-accent-700 dark:text-accent-200'
                : 'text-surface-500 hover:text-surface-100 dark:text-surface-600 dark:hover:text-surface-800'
            }`}
          >
            {/* The lit background is one element that slides between options, so
                the selection reads as movement rather than as two independent
                colour changes. */}
            {selected && (
              <motion.span
                layoutId={`segmented-${groupId}`}
                transition={prefersReducedMotion ? { duration: 0 } : springSnappy}
                className="absolute inset-0 rounded-xl bg-accent-50 ring-1 ring-accent-300 dark:bg-accent-900/40 dark:ring-accent-700"
              />
            )}
            <span className="relative block text-sm font-semibold">{option.label}</span>
            {option.hint && (
              <span className="relative mt-0.5 block text-xs opacity-70">{option.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
