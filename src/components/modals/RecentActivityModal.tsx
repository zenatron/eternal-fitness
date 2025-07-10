'use client';

import { useState, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  ChartBarIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ScaleIcon,
  BoltIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { motion } from 'framer-motion';
import { formatVolume } from '@/utils/formatters';

interface RecentActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStatsData;
  useMetric: boolean;
}

type SortOption = 'date' | 'duration' | 'volume' | 'sets' | 'template';
type SortDirection = 'asc' | 'desc';

export function RecentActivityModal({ isOpen, onClose, stats, useMetric }: RecentActivityModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');



  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // Compare dates by setting time to midnight to avoid time-of-day issues
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = nowOnly.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Format time
    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Format date based on recency
    let dateLabel = '';
    if (diffDays === 0) {
      dateLabel = 'Today';
    } else if (diffDays === 1) {
      dateLabel = 'Yesterday';
    } else if (diffDays <= 7) {
      dateLabel = date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      dateLabel = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }

    return `${dateLabel} at ${timeString}`;
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const filteredAndSortedSessions = useMemo(() => {
    if (!stats?.recentSessions) return [];

    let filtered = stats.recentSessions.filter(session =>
      session.templateName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'volume':
          comparison = a.totalVolume - b.totalVolume;
          break;
        case 'sets':
          comparison = a.totalSets - b.totalSets;
          break;
        case 'template':
          comparison = a.templateName.localeCompare(b.templateName);
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [stats?.recentSessions, searchTerm, sortBy, sortDirection]);

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
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <ChartBarIcon className="w-8 h-8 text-green-500" />
                    Recent Activity
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({filteredAndSortedSessions.length} total)
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
                      placeholder="Search workout templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Sort Options */}
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: 'date' as SortOption, label: 'Date', icon: CalendarDaysIcon },
                      { key: 'template' as SortOption, label: 'Template', icon: DocumentTextIcon },
                      { key: 'duration' as SortOption, label: 'Duration', icon: ClockIcon },
                      { key: 'volume' as SortOption, label: 'Volume', icon: ScaleIcon },
                      { key: 'sets' as SortOption, label: 'Sets', icon: BoltIcon },
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() => handleSort(option.key)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                          sortBy === option.key
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
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

                {/* Sessions List */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredAndSortedSessions.length === 0 ? (
                    <div className="text-center py-12">
                      <ChartBarIcon className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
                        {searchTerm ? 'No sessions found matching your search.' : 'No workout sessions yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAndSortedSessions.map((session, index) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.02 }}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                              {session.templateName}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <CalendarDaysIcon className="w-4 h-4" />
                              <span>{formatFullDate(session.completedAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <ClockIcon className="w-4 h-4" />
                              <span>{formatDuration(session.duration)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                              <ScaleIcon className="w-4 h-4" />
                              <span>{formatVolume(session.totalVolume, useMetric)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <BoltIcon className="w-4 h-4" />
                              <span>{session.totalSets} sets</span>
                            </div>
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
