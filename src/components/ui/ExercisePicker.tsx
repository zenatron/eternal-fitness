'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { searchExercises } from '@/lib/exerciseSearch';
import { springSnappy } from '@/lib/motion';

/**
 * The one way to pick an exercise out of the library.
 *
 * The template builder and the log-past-workout page each had their own picker:
 * different search behaviour, different result layout, different affordances.
 * Adding an exercise felt like using two different apps, and only one of them
 * could find "incline db press". Both now render this.
 *
 * `layout` is the only thing that differs between the two callers — the builder
 * has a full-width card to fill and shows a grid, the log flow drops the picker
 * inline inside a step and wants a compact list.
 */

const QUICK_SEARCHES = ['chest', 'legs', 'back', 'shoulders', 'barbell', 'dumbbell'] as const;

interface ExercisePickerProps {
  onSelect: (exerciseKey: string, name: string) => void;
  layout?: 'grid' | 'list';
  /** Caps an unfiltered library that would otherwise render several hundred rows. */
  initialLimit?: number;
  autoFocus?: boolean;
  className?: string;
}

export function ExercisePicker({
  onSelect,
  layout = 'grid',
  initialLimit,
  autoFocus = false,
  className = '',
}: ExercisePickerProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const matches = searchExercises(query);
    // The limit is a preview of an unsearched library; once the user types they
    // should see everything that matched, or the count below would lie.
    return !query.trim() && initialLimit ? matches.slice(0, initialLimit) : matches;
  }, [query, initialLimit]);

  const isGrid = layout === 'grid';

  return (
    <div className={className}>
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={autoFocus}
          className="form-input !pl-11 !pr-11"
          placeholder="Search exercises — try 'incline press' or 'quads'"
          aria-label="Search exercises"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-surface-500 transition-colors hover:text-surface-700 dark:hover:text-surface-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {query.trim() ? (
        <p className="form-hint">
          {results.length} exercise{results.length === 1 ? '' : 's'} found
        </p>
      ) : (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-surface-500 dark:text-surface-600">Quick searches:</span>
          {QUICK_SEARCHES.map((term) => (
            <motion.button
              key={term}
              type="button"
              onClick={() => setQuery(term)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              transition={springSnappy}
              className="rounded-md bg-surface-900 px-2 py-1 text-xs text-surface-500 transition-colors hover:bg-accent-100 hover:text-accent-700 dark:bg-surface-200 dark:text-surface-600 dark:hover:bg-accent-900/30 dark:hover:text-accent-300"
            >
              {term}
            </motion.button>
          ))}
        </div>
      )}

      <div
        className={`mt-4 overflow-y-auto pr-1 ${isGrid ? 'grid max-h-80 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3' : 'max-h-72 space-y-1.5'}`}
      >
        {results.length === 0 ? (
          <div className={`py-10 text-center ${isGrid ? 'col-span-full' : ''}`}>
            <MagnifyingGlassIcon className="mx-auto mb-3 h-10 w-10 text-surface-400 dark:text-surface-500" />
            <p className="text-sm text-surface-500 dark:text-surface-600">
              Nothing matched &ldquo;{query}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-3 text-sm font-display font-semibold uppercase tracking-wide text-accent-600 transition-colors hover:text-accent-500 dark:text-accent-400"
            >
              Clear search
            </button>
          </div>
        ) : (
          results.map(([key, exercise]) => (
            <motion.button
              key={key}
              type="button"
              onClick={() => onSelect(key, exercise.name)}
              whileHover={{ scale: isGrid ? 1.02 : 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={springSnappy}
              className={`w-full rounded-xl border border-surface-200 bg-white text-left transition-colors hover:border-accent-400/60 hover:bg-accent-50 dark:border-surface-300 dark:bg-surface-100 dark:hover:border-accent-500/40 dark:hover:bg-accent-900/20 tap-control ${
                isGrid ? 'p-4' : 'flex items-center justify-between gap-3 px-4 py-3'
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-surface-50 dark:text-white">
                  {exercise.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-surface-500 dark:text-surface-600">
                  {exercise.muscles.slice(0, 2).join(', ')}
                  {exercise.muscles.length > 2 && ` +${exercise.muscles.length - 2}`}
                  {' · '}
                  {exercise.equipment.slice(0, 2).join(', ')}
                </span>
              </span>
              {exercise.exerciseType === 'cardio' && (
                <span className="shrink-0 rounded bg-info-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-info-600 dark:bg-info-900/30 dark:text-info-400">
                  cardio
                </span>
              )}
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
