'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ModalShell } from '@/components/ui/ModalShell';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  TrophyIcon,
  TagIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { motion } from 'framer-motion';
import { formatVolume, formatWeight } from '@/utils/formatters';
import { springSnappy } from '@/lib/motion';


interface TopExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStatsData;
  useMetric: boolean;
}

type SortOption = 'volume' | 'sessions' | 'maxWeight' | 'name';
type SortDirection = 'asc' | 'desc';

export function TopExercisesModal({ isOpen, onClose, stats, useMetric }: TopExercisesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredAndSortedExercises = useMemo(() => {
    if (!stats?.topExercises) return [];

    const filtered = stats.topExercises.filter(exercise =>
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'volume':
          comparison = a.totalVolume - b.totalVolume;
          break;
        case 'sessions':
          comparison = a.sessionCount - b.sessionCount;
          break;
        case 'maxWeight':
          comparison = a.maxWeight - b.maxWeight;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [stats?.topExercises, searchTerm, sortBy, sortDirection]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('desc');
    }
  };

  // Global max across all exercises so the bar baseline matches the inline card.
  const maxVolume = Math.max(0, ...(stats?.topExercises?.map(ex => ex.totalVolume) ?? [0]));

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Top exercises"
      subtitle={`${stats?.topExercises?.length ?? 0} tracked`}
      maxWidth="max-w-4xl"
    >
      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <motion.div
          className="relative flex-1"
          whileFocus={{ scale: 1.01 }}
          transition={springSnappy}
        >
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-600" />
          <input
            type="text"
            placeholder="Search exercises"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input !pl-10"
          />
        </motion.div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: 'volume' as SortOption, label: 'Volume', icon: FireIcon },
            { key: 'sessions' as SortOption, label: 'Sessions', icon: CalendarDaysIcon },
            { key: 'maxWeight' as SortOption, label: 'Heaviest', icon: TrophyIcon },
            { key: 'name' as SortOption, label: 'Name', icon: TagIcon },
          ].map((option) => (
            <motion.button
              key={option.key}
              onClick={() => handleSort(option.key)}
              aria-pressed={sortBy === option.key}
              className="chip"
            >
              {option.label}
              {sortBy === option.key ? (
              sortDirection === 'asc' ? (
                <ArrowUpIcon className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownIcon className="h-3.5 w-3.5" />
              )
            ) : null}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Exercises List */}
      {filteredAndSortedExercises.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-surface-500 dark:text-surface-600">
            {searchTerm ? 'No exercises match that search.' : 'No exercise data yet.'}
          </p>
        </div>
      ) : (
        /* The same row as the profile's Top exercises card, just all of them:
           this used to be a different design — rank tiles, icon-topped metric
           boxes, a tinted wash behind each card — for the same data. */
        <ol className="row-list">
          {filteredAndSortedExercises.map((exercise, index) => (
            <motion.li
              key={exercise.exerciseKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springSnappy, delay: Math.min(index * 0.03, 0.3) }}
              className="py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/exercise/${encodeURIComponent(exercise.exerciseKey)}`}
                  className="truncate text-sm font-medium text-surface-50 hover:text-accent-600 dark:text-white dark:hover:text-accent-400"
                >
                  {exercise.name}
                </Link>
                <span className="shrink-0 text-xs text-surface-500 dark:text-surface-600 tabular">
                  {exercise.sessionCount}× · best {formatWeight(exercise.maxWeight, useMetric)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
                  <span
                    className="block h-full rounded-full bg-accent-500"
                    style={{ width: `${maxVolume > 0 ? (exercise.totalVolume / maxVolume) * 100 : 0}%` }}
                  />
                </span>
                <span className="w-[4.75rem] shrink-0 whitespace-nowrap text-right text-xs text-surface-300 dark:text-surface-800 tabular">
                  {formatVolume(exercise.totalVolume, useMetric)}
                </span>
              </div>
            </motion.li>
          ))}
        </ol>
      )}

      {/* Footer */}
      <div className="mt-6 flex justify-end">
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={springSnappy}
          className="btn btn-tertiary"
        >
          Close
        </motion.button>
      </div>
    </ModalShell>
  );
}
