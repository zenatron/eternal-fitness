'use client';

import { useState, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
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
import { motion } from 'framer-motion';
import { formatVolume } from '@/utils/formatters';

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
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <BoltIcon className="w-8 h-8 text-blue-500" />
                    Top Exercises
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({filteredAndSortedExercises.length} total)
                    </span>
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                {/* Search and Sort Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  {/* Search */}
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search exercises..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Sort Options */}
                  <div className="flex gap-2">
                    {[
                      { key: 'volume' as SortOption, label: 'Volume', icon: BoltIcon },
                      { key: 'sessions' as SortOption, label: 'Sessions', icon: CalendarDaysIcon },
                      { key: 'maxWeight' as SortOption, label: 'Max Weight', icon: TrophyIcon },
                      { key: 'name' as SortOption, label: 'Name', icon: TagIcon },
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() => handleSort(option.key)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                          sortBy === option.key
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <option.icon className="w-4 h-4" />
                        {option.label}
                        <ChevronUpDownIcon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exercises List */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredAndSortedExercises.length === 0 ? (
                    <div className="text-center py-12">
                      <BoltIcon className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
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
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="relative p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            {/* Progress bar background */}
                            <div className="absolute inset-0 rounded-xl overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 transition-all duration-500"
                                style={{ width: `${volumePercentage}%` }}
                              />
                            </div>
                            
                            {/* Content */}
                            <div className="relative flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    #{index + 1}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                                    {exercise.name}
                                  </h4>
                                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mt-1">
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
                              <div className="text-right">
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  {formatVolume(exercise.totalVolume, useMetric)}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Total Volume
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
