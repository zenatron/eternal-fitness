'use client';

import { useState, useMemo, useCallback } from 'react';
import { ModalShell } from '@/components/ui/ModalShell';
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
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { UserStatsData } from '@/lib/hooks/useUserStats';
import { motion, AnimatePresence } from 'framer-motion';
import { formatVolume } from '@/utils/formatters';
import { formatDurationCompact } from '@/utils/durationUtils';
import { EditSessionModal } from './EditSessionModal';
import { springSnappy } from '@/lib/motion';


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
  const [editingSession, setEditingSession] = useState<any>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);

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

  const handleEditSession = useCallback(async (session: typeof filteredAndSortedSessions[0]) => {
    setLoadingSessionId(session.id);
    try {
      const response = await fetch(`/api/session/${session.id}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      const result = await response.json();
      const fullSession = result.data;

      setEditingSession({
        id: fullSession.id,
        completedAt: fullSession.completedAt,
        duration: fullSession.duration || 0,
        totalVolume: fullSession.totalVolume || 0,
        totalSets: fullSession.totalSets || 0,
        totalExercises: fullSession.totalExercises || 0,
        notes: fullSession.notes,
        performanceData: fullSession.performanceData,
        templateName: fullSession.workoutTemplate?.name || session.templateName,
      });
    } catch (error) {
      console.error('Failed to load session for editing:', error);
    } finally {
      setLoadingSessionId(null);
    }
  }, []);

  return (
    <>
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Recent Activity"
      subtitle={`${filteredAndSortedSessions.length} sessions`}
      maxWidth="max-w-4xl"
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-900/30">
          <ChartBarIcon className="h-5 w-5 text-accent-500" />
        </div>
      }
    >

                      {/* Search and Sort */}
                      <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                          <input
                            type="text"
                            placeholder="Search workout templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input !pl-11"
                          />
                        </div>

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
                              className={`px-3 py-2 rounded-lg text-sm font-display font-semibold tracking-wide uppercase flex items-center gap-1.5 transition-colors ${
                                sortBy === option.key
                                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                                  : 'bg-surface-900 dark:bg-surface-200 text-surface-600 dark:text-surface-800 hover:bg-surface-800 dark:hover:bg-surface-300'
                              }`}
                            >
                              <option.icon className="w-4 h-4" />
                              <span className="hidden sm:inline text-xs">{option.label}</span>
                              <ChevronUpDownIcon className="w-3.5 h-3.5" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sessions List */}
                      <div className="">
                        {filteredAndSortedSessions.length === 0 ? (
                          <div className="text-center py-12">
                            <ChartBarIcon className="w-16 h-16 text-surface-300 dark:text-surface-500 mx-auto mb-4" />
                            <p className="text-surface-500 dark:text-surface-600">
                              {searchTerm ? 'No sessions found matching your search.' : 'No workout sessions yet.'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {filteredAndSortedSessions.map((session, index) => (
                              <motion.div
                                key={session.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ ...springSnappy, delay: index * 0.03 }}
                                className="form-section !p-4 flex items-center justify-between hover:!border-accent-400/30 dark:hover:!border-accent-500/30 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-display font-bold text-surface-50 dark:text-white tracking-wide text-sm truncate">
                                    {session.templateName}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-600 mt-1">
                                    <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{formatFullDate(session.completedAt)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm shrink-0 ml-4">
                                  <div className="flex items-center gap-1 text-accent-600 dark:text-accent-400">
                                    <ClockIcon className="w-4 h-4" />
                                    <span className="text-xs font-medium">{formatDurationCompact(session.duration)}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-accent-600 dark:text-accent-400">
                                    <ScaleIcon className="w-4 h-4" />
                                    <span className="text-xs font-medium">{formatVolume(session.totalVolume, useMetric)}</span>
                                  </div>
                                  <div className="hidden sm:flex items-center gap-1 text-accent-600 dark:text-accent-400">
                                    <BoltIcon className="w-4 h-4" />
                                    <span className="text-xs font-medium">{session.totalSets} sets</span>
                                  </div>
                                  <button
                                    onClick={() => handleEditSession(session)}
                                    disabled={loadingSessionId === session.id}
                                    className="p-2 text-surface-400 hover:text-accent-500 dark:hover:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    title="Edit workout"
                                  >
                                    {loadingSessionId === session.id ? (
                                      <div className="w-4 h-4 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <PencilSquareIcon className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="mt-6 flex justify-end">
                        <button onClick={onClose} className="btn btn-tertiary">
                          Close
                        </button>
                      </div>
    </ModalShell>

      <EditSessionModal
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession}
        useMetric={useMetric}
      />
    </>
  );
}
