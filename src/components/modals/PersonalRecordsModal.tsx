'use client';

import { useState, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
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
import { motion } from 'framer-motion';

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

  const formatVolume = (volume: number) => {
    const unit = useMetric ? 'kg' : 'lbs';
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M ${unit}`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K ${unit}`;
    }
    return `${volume.toFixed(0)} ${unit}`;
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
                    <TrophyIcon className="w-8 h-8 text-yellow-500" />
                    Personal Records
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({filteredAndSortedRecords.length} total)
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
                      { key: 'date' as SortOption, label: 'Date', icon: CalendarDaysIcon },
                      { key: 'exercise' as SortOption, label: 'Exercise', icon: TagIcon },
                      { key: 'value' as SortOption, label: 'Value', icon: ScaleIcon },
                      { key: 'type' as SortOption, label: 'Type', icon: ListBulletIcon },
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

                {/* Records List */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredAndSortedRecords.length === 0 ? (
                    <div className="text-center py-12">
                      <TrophyIcon className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
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
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                              <TrophyIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white">
                                {record.exerciseName}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                {record.type === 'weight' ? 'Max Weight' : 
                                 record.type === 'reps' ? 'Max Reps' : 'Max Volume'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(record.achievedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                              {record.type === 'weight' ? formatWeight(record.value) : 
                               record.type === 'reps' ? `${record.value} reps` :
                               formatVolume(record.value)}
                            </p>
                          </div>
                        </motion.div>
                      ))}
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
