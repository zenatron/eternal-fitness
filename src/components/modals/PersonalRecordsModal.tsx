'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ModalShell } from '@/components/ui/ModalShell';
import {
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
import { formatPRValue, prTypeFromApi } from '@/utils/prFormatting';
import { springSnappy, springBouncy, springGentle } from '@/lib/motion';


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

    const filtered = stats.personalRecords.filter(record =>
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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Personal Records"
      subtitle={`${filteredAndSortedRecords.length} records`}
      maxWidth="max-w-4xl"
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-award-100 dark:bg-award-900/30">
          <TrophyIcon className="h-5 w-5 text-award-500" />
        </div>
      }
    >

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
                              ? 'bg-award-100 dark:bg-award-900/30 text-award-700 dark:text-award-300'
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

                  {/* Records List */}
                  <div className="">
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
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-award-50 to-award-100 dark:from-award-900/20 dark:to-award-900/20 rounded-xl border border-award-200 dark:border-award-800 hover:shadow-md"
                          >
                            <div className="flex items-center gap-3">
                              <motion.div
                                initial={{ scale: 0, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ ...springBouncy, delay: index * 0.05 + 0.1 }}
                                className="p-2 bg-award-100 dark:bg-award-900/30 rounded-lg"
                              >
                                <TrophyIcon className="w-5 h-5 text-award-600 dark:text-award-400" />
                              </motion.div>
                              <div>
                                <Link
                                  href={`/exercise/${encodeURIComponent(record.exerciseName)}`}
                                  className="font-bold text-surface-50 hover:text-accent-600 dark:text-white dark:hover:text-accent-400"
                                >
                                  {record.exerciseName}
                                </Link>
                                <p className="text-sm text-surface-500 dark:text-surface-600 font-medium">
                                  {record.type === 'weight' ? 'Max Weight' : 
                                   record.type === 'volume' ? 'Max Volume' :
                                   record.type === 'duration' ? 'Max Duration' : 'Max Distance'}
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
                              <p className="text-lg font-display font-bold text-award-600 dark:text-award-400">
                                {formatPRValue(record.value, prTypeFromApi(record.type), useMetric)}
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
    </ModalShell>
  );
}
