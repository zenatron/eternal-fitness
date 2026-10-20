'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  TrophyIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useProfile } from '@/lib/hooks/useProfile';
import { queryKeys } from '@/lib/queryKeys';
import { formatPRValue, prTypeFromApi, PR_TYPE_LABELS, PR_TYPE_ICONS } from '@/utils/prFormatting';
import { springSnappy } from '@/lib/motion';
import { ErrorState } from '@/components/ui/ErrorState';

interface PRRecord {
  exerciseKey: string;
  exerciseName: string;
  type: string;
  value: number;
  achievedAt: string;
}

type SortOption = 'date' | 'value' | 'exercise';
/** API type names, in presentation order. Drives both the filter and the list. */
const FILTER_TYPES = ['weight', 'oneRepMax', 'volume', 'duration', 'distance'] as const;

type TypeFilter = 'all' | (typeof FILTER_TYPES)[number];

// Labels and icons come from the shared PR maps rather than a local copy, so a
// new record type shows up here without a second edit.
const label = (apiType: string) => PR_TYPE_LABELS[prTypeFromApi(apiType)];
const icon = (apiType: string) => PR_TYPE_ICONS[prTypeFromApi(apiType)];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Keystrokes are debounced into query changes; the query itself is cancelled
 *  on change, so a slow response can no longer overwrite a newer one. */
const SEARCH_DEBOUNCE_MS = 250;

export default function PersonalRecordsPage() {
  const prefersReducedMotion = useReducedMotion();
  const { profile } = useProfile();
  const useMetric = profile?.useMetric ?? false;

  const [rawSearch, setSearch] = useState('');
  const [search, setSearchDebounced] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(rawSearch), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const isStaleSearch = rawSearch !== search;

  const {
    data: records = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<PRRecord[]>({
    queryKey: [...queryKeys.personalRecords, { search, typeFilter, sortBy }],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      params.set('sort', sortBy);
      const response = await fetch(`/api/personal-records?${params.toString()}`, { signal });
      if (!response.ok) {
        // A 500 whose envelope parses used to fall through as `data.records
        // === undefined` and render the empty state — an error dressed up as
        // "no records".
        throw new Error('Failed to load personal records');
      }
      const data = await response.json();
      return (data.records ?? []) as PRRecord[];
    },
    staleTime: 60 * 1000,
    placeholderData: (previous) => previous,
  });

  const sorted = useMemo(() => {
    if (sortDir === 'asc') {
      if (sortBy === 'date') return [...records].reverse();
      return [...records].reverse();
    }
    return records;
  }, [records, sortDir, sortBy]);

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDir('desc');
    }
  };

  const sortIcon = (option: SortOption) => {
    if (sortBy !== option) return null;
    return sortDir === 'asc'
      ? <ArrowUpIcon className="w-3.5 h-3.5" />
      : <ArrowDownIcon className="w-3.5 h-3.5" />;
  };

  return (
    <div className="px-4 pb-16 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          back
          title="Personal records"
          description={`${records.length} record${records.length !== 1 ? 's' : ''} across all exercises`}
        />

        <div className="forge-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                type="text"
                placeholder="Search exercises..."
                aria-label="Search personal records"
                value={rawSearch}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input !pl-10"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="form-select !py-2 w-full sm:w-44"
              aria-label="Filter by record type"
            >
              <option value="all">All Types</option>
              {FILTER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {label(t)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 mt-4 text-xs">
            <button
              onClick={() => toggleSort('date')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                sortBy === 'date'
                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400'
                  : 'text-surface-500 hover:text-surface-50 dark:hover:text-white'
              }`}
            >
              Date {sortIcon('date')}
            </button>
            <button
              onClick={() => toggleSort('value')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                sortBy === 'value'
                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400'
                  : 'text-surface-500 hover:text-surface-50 dark:hover:text-white'
              }`}
            >
              Value {sortIcon('value')}
            </button>
            <button
              onClick={() => toggleSort('exercise')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                sortBy === 'exercise'
                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400'
                  : 'text-surface-500 hover:text-surface-50 dark:hover:text-white'
              }`}
            >
              Exercise {sortIcon('exercise')}
            </button>
          </div>
        </div>

        {isError ? (
          <ErrorState what="your personal records" onRetry={() => refetch()} isRetrying={isFetching} />
        ) : isLoading ? (
          <div className="forge-card p-12 text-center text-surface-500" role="status">
            Loading records…
          </div>
        ) : sorted.length === 0 ? (
          <div className="forge-card p-12 text-center text-surface-500">
            <TrophyIcon className="w-16 h-16 mx-auto mb-4 text-surface-600" />
            <p className="text-lg font-display font-medium">
              {search || typeFilter !== 'all'
                ? 'No records match your filters'
                : 'No personal records yet'}
            </p>
            <p className="text-sm mt-2 text-surface-500">
              Complete workouts to start setting personal records
            </p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isStaleSearch ? 'opacity-60 transition-opacity' : ''}`}>
            {sorted.map((record, i) => (
              <motion.div
                key={`${record.exerciseKey}_${record.type}`}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ ...springSnappy, delay: prefersReducedMotion ? 0 : Math.min(i * 0.03, 0.3) }}
                className="forge-card p-5 flex items-center justify-between hover:border-accent-400/30 dark:hover:border-accent-500/20"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl" aria-hidden>{icon(record.type)}</span>
                  <div>
                    <Link
                      href={`/exercise/${encodeURIComponent(record.exerciseName)}`}
                      className="font-display font-bold text-surface-50 hover:text-accent-600 dark:text-white dark:hover:text-accent-400 text-sm tracking-wide"
                    >
                      {record.exerciseName}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-500 text-white">
                        {label(record.type)}
                      </span>
                      <span className="text-xs text-surface-500">
                        {formatDate(record.achievedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-display font-black text-accent-600 dark:text-accent-400">
                    {formatPRValue(record.value, prTypeFromApi(record.type), useMetric)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
