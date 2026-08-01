'use client';

import { useState, useMemo } from 'react';
import { ModalShell } from '@/components/ui/ModalShell';
import {
  BoltIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  TrophyIcon,
  ScaleIcon,
  TagIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { motion } from 'framer-motion';
import { formatVolume, formatWeight } from '@/utils/formatters';
import { springSnappy, springBouncy } from '@/lib/motion';


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
      title="Top Exercises"
      subtitle={`${stats?.topExercises?.length ?? 0} tracked`}
      maxWidth="max-w-4xl"
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-900/30">
          <BoltIcon className="h-5 w-5 text-accent-500" />
        </div>
      }
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
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input !pl-10"
          />
        </motion.div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: 'volume' as SortOption, label: 'Volume', icon: FireIcon },
            { key: 'sessions' as SortOption, label: 'Sessions', icon: CalendarDaysIcon },
            { key: 'maxWeight' as SortOption, label: 'Max Weight', icon: TrophyIcon },
            { key: 'name' as SortOption, label: 'Name', icon: TagIcon },
          ].map((option) => (
            <motion.button
              key={option.key}
              onClick={() => handleSort(option.key)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={springSnappy}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
                sortBy === option.key
                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                  : 'bg-surface-900 dark:bg-surface-200 text-surface-100 dark:text-surface-800 hover:bg-surface-800 dark:hover:bg-surface-600'
              }`}
            >
              <option.icon className="w-4 h-4" />
              {option.label}
              <ChevronUpDownIcon className="w-4 h-4" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Exercises List */}
      {filteredAndSortedExercises.length === 0 ? (
        <div className="text-center py-12">
          <BoltIcon className="w-20 h-20 text-surface-600 mx-auto mb-6" />
          <p className="text-surface-500 dark:text-surface-600 text-lg">
            {searchTerm ? 'No exercises found matching your search.' : 'No exercise data available yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedExercises.map((exercise, index) => {
            const volumePercentage = maxVolume > 0 ? (exercise.totalVolume / maxVolume) * 100 : 0;

            return (
              <motion.div
                key={exercise.exerciseKey}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springSnappy, delay: Math.min(index * 0.05, 0.4) }}
                className="relative p-5 bg-surface-950 dark:bg-surface-200/50 rounded-xl hover:bg-surface-900 dark:hover:bg-surface-200 transition-colors overflow-hidden"
              >
                {/* Volume progress bar background */}
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-accent-100/70 to-accent-200/50 dark:from-accent-900/30 dark:to-accent-800/20"
                    initial={{ width: 0 }}
                    animate={{ width: `${volumePercentage}%` }}
                    transition={{ ...springBouncy, delay: Math.min(index * 0.05, 0.4) + 0.1 }}
                  />
                </div>

                <div className="relative">
                  {/* Name + rank */}
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      className="flex items-center justify-center w-12 h-12 bg-accent-100 dark:bg-accent-900/40 rounded-xl shrink-0"
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ ...springBouncy, delay: Math.min(index * 0.05, 0.4) + 0.15 }}
                    >
                      <span className="text-lg font-display font-bold text-accent-600 dark:text-accent-400 tabular">
                        #{index + 1}
                      </span>
                    </motion.div>
                    <h4 className="font-display font-bold text-surface-50 dark:text-white text-lg leading-tight">
                      {exercise.name}
                    </h4>
                  </div>

                  {/* Metric strip */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2.5 text-center backdrop-blur-sm">
                      <CalendarDaysIcon className="w-4 h-4 text-surface-500 dark:text-surface-600 mx-auto mb-1" />
                      <p className="text-base font-display font-bold text-surface-50 dark:text-white tabular leading-none">
                        {exercise.sessionCount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-surface-500 dark:text-surface-600 uppercase tracking-wider mt-1.5">
                        Sessions
                      </p>
                    </div>
                    <div className="bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2.5 text-center backdrop-blur-sm">
                      <ScaleIcon className="w-4 h-4 text-surface-500 dark:text-surface-600 mx-auto mb-1" />
                      <p className="text-base font-display font-bold text-surface-50 dark:text-white tabular leading-none">
                        {formatWeight(exercise.maxWeight, useMetric)}
                      </p>
                      <p className="text-[10px] text-surface-500 dark:text-surface-600 uppercase tracking-wider mt-1.5">
                        Max
                      </p>
                    </div>
                    <div className="bg-accent-100/70 dark:bg-accent-900/30 rounded-lg px-3 py-2.5 text-center backdrop-blur-sm">
                      <FireIcon className="w-4 h-4 text-accent-600 dark:text-accent-400 mx-auto mb-1" />
                      <p className="text-base font-display font-bold text-accent-600 dark:text-accent-400 tabular leading-none">
                        {formatVolume(exercise.totalVolume, useMetric)}
                      </p>
                      <p className="text-[10px] text-accent-600/80 dark:text-accent-400/80 uppercase tracking-wider mt-1.5">
                        Volume
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
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
