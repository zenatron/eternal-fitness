'use client';

import { useState, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import {
  XMarkIcon,
  TrophyIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  TagIcon,
  ScaleIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { motion, AnimatePresence } from 'framer-motion';
import { formatVolume } from '@/utils/formatters';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

interface PersonalRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStatsData;
  useMetric: boolean;
}

type SortOption = 'date' | 'exercise' | 'value' | 'type';
type SortDirection = 'asc' | 'desc';

export function PersonalRecordsModal({ isOpen, onClose, stats, useMetric }: PersonalRecordsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const formatWeight = (weight: number) => {
    const unit = useMetric ? 'kg' : 'lbs';
    return `${weight.toFixed(1)} ${unit}`;
  };



  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredAndSortedRecords = useMemo(() => {
    if (!stats?.personalRecords) return [];

    let filtered = stats.personalRecords.filter(record =>
      record.exerciseName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.achievedAt).getTime() - new Date(b.achievedAt).getTime();
          break;
        case 'exercise':
          comparison = a.exerciseName.localeCompare(b.exerciseName);
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [stats?.personalRecords, searchTerm, sortBy, sortDirection]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('desc');
    }
  };

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
                      <TrophyIcon className="w-8 h-8 text-yellow-500" />
                      Personal Records
                      <span className="text-sm font-normal text-surface-500 dark:text-surface-600">
                        ({filteredAndSortedRecords.length} total)
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
                        { key: 'date' as SortOption, label: 'Date', icon: CalendarDaysIcon },
                        { key: 'exercise' as SortOption, label: 'Exercise', icon: TagIcon },
                        { key: 'value' as SortOption, label: 'Value', icon: ScaleIcon },
                        { key: 'type' as SortOption, label: 'Type', icon: ListBulletIcon },
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

                  {/* Records List */}
                  <div className="max-h-96 overflow-y-auto">
                    {filteredAndSortedRecords.length === 0 ? (
                      <div className="text-center py-12">
                        <TrophyIcon className="w-20 h-20 text-surface-600 mx-auto mb-6" />
                        <p className="text-surface-500 dark:text-surface-600 text-lg">
                          {searchTerm ? 'No records found matching your search.' : 'No personal records yet.'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredAndSortedRecords.map((record, index) => (
                          <motion.div
                            key={`${record.exerciseKey}_${record.type}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...springSnappy, delay: index * 0.05 }}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 hover:shadow-md"
                          >
                            <div className="flex items-center gap-3">
                              <motion.div
                                initial={{ scale: 0, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ ...springBouncy, delay: index * 0.05 + 0.1 }}
                                className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg"
                              >
                                <TrophyIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                              </motion.div>
                              <div>
                                <h4 className="font-bold text-surface-800 dark:text-white">
                                  {record.exerciseName}
                                </h4>
                                <p className="text-sm text-surface-500 dark:text-surface-600 font-medium">
                                  {record.type === 'weight' ? 'Max Weight' : 
                                   record.type === 'reps' ? 'Max Reps' : 'Max Volume'}
                                </p>
                                <p className="text-xs text-surface-500 dark:text-surface-600">
                                  {formatDate(record.achievedAt)}
                                </p>
                              </div>
                            </div>
                            <motion.div
                              className="text-right"
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ ...springGentle, delay: index * 0.05 + 0.15 }}
                            >
                              <p className="text-lg font-display font-bold text-yellow-600 dark:text-yellow-400">
                                {record.type === 'weight' ? formatWeight(record.value) : 
                                 record.type === 'reps' ? `${record.value} reps` :
                                 formatVolume(record.value, useMetric)}
                              </p>
                            </motion.div>
                          </motion.div>
                        ))}
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
