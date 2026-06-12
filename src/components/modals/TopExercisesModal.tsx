'use client';

import { useState, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import {
  XMarkIcon,
  BoltIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  TrophyIcon,
  ScaleIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { motion, AnimatePresence } from 'framer-motion';
import { formatVolume } from '@/utils/formatters';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

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



  const formatWeight = (weight: number) => {
    const unit = useMetric ? 'kg' : 'lbs';
    return `${weight.toFixed(1)} ${unit}`;
  };

  const filteredAndSortedExercises = useMemo(() => {
    if (!stats?.topExercises) return [];

    let filtered = stats.topExercises.filter(exercise =>
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

  const maxVolume = Math.max(...(filteredAndSortedExercises.map(ex => ex.totalVolume) || [0]));

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog as="div" className="relative z-50" open={isOpen} onClose={onClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springGentle}
            className="fixed inset-0 bg-black bg-opacity-25"
          />

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={springBouncy}
                className="w-full max-w-4xl"
              >
                <Dialog.Panel className="forge-card overflow-hidden shadow-2xl p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white flex items-center gap-3">
                      <BoltIcon className="w-8 h-8 text-blue-500" />
                      Top Exercises
                      <span className="text-sm font-normal text-surface-500 dark:text-surface-600">
                        ({filteredAndSortedExercises.length} total)
                      </span>
                    </Dialog.Title>
                    <motion.button
                      onClick={onClose}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={springSnappy}
                      className="p-2 hover:bg-surface-100 dark:hover:bg-surface-200 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="w-6 h-6 text-surface-500 dark:text-surface-600" />
                    </motion.button>
                  </div>

                  {/* Search and Sort Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    {/* Search */}
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

                    {/* Sort Options */}
                    <div className="flex gap-2">
                      {[
                        { key: 'volume' as SortOption, label: 'Volume', icon: BoltIcon },
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
                              ? 'bg-forge-100 dark:bg-forge-900/30 text-blue-700 dark:text-blue-300'
                              : 'bg-surface-100 dark:bg-surface-200 text-surface-600 dark:text-surface-800 hover:bg-surface-200 dark:hover:bg-surface-600'
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
                  <div className="max-h-96 overflow-y-auto">
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
                              transition={{ ...springSnappy, delay: index * 0.05 }}
                              className="relative p-4 bg-surface-950 dark:bg-surface-200/50 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors"
                            >
                              {/* Progress bar background */}
                              <div className="absolute inset-0 rounded-xl overflow-hidden">
                                <motion.div 
                                  className="h-full bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-forge-800/30"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${volumePercentage}%` }}
                                  transition={{ ...springBouncy, delay: index * 0.05 + 0.1 }}
                                />
                              </div>
                              
                              {/* Content */}
                              <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <motion.div
                                    className="flex items-center justify-center w-12 h-12 bg-forge-100 dark:bg-forge-900/30 rounded-xl"
                                    initial={{ scale: 0, rotate: -10 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ ...springBouncy, delay: index * 0.05 + 0.15 }}
                                  >
                                    <span className="text-lg font-display font-bold text-forge-600 dark:text-forge-400">
                                      #{index + 1}
                                    </span>
                                  </motion.div>
                                  <div>
                                    <h4 className="font-bold text-surface-800 dark:text-white text-lg">
                                      {exercise.name}
                                    </h4>
                                    <div className="flex items-center gap-6 text-sm text-surface-500 dark:text-surface-600 mt-1">
                                      <div className="flex items-center gap-2">
                                        <CalendarDaysIcon className="w-4 h-4" />
                                        <span>{exercise.sessionCount} sessions</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <TrophyIcon className="w-4 h-4" />
                                        <span>Max: {formatWeight(exercise.maxWeight)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <motion.div
                                  className="text-right"
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ ...springGentle, delay: index * 0.05 + 0.2 }}
                                >
                                  <p className="text-2xl font-display font-bold tracking-wide text-forge-600 dark:text-forge-400">
                                    {formatVolume(exercise.totalVolume, useMetric)}
                                  </p>
                                  <p className="text-sm text-surface-500 dark:text-surface-600">
                                    Total Volume
                                  </p>
                                </motion.div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>

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
                </Dialog.Panel>
              </motion.div>
            </div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
