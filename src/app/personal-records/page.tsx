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
import { formatPRValue, prTypeFromApi, PR_TYPE_LABELS } from '@/utils/prFormatting';
import { EmptyState } from '@/components/ui/EmptyState';
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

// Labels come from the shared PR maps rather than a local copy, so a
// new record type shows up here without a second edit.
const label = (apiType: string) => PR_TYPE_LABELS[prTypeFromApi(apiType)];
const SORT_LABELS: Record<SortOption, string> = { date: 'Date', value: 'Value', exercise: 'Name' };

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
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
      <div className="mx-auto max-w-3xl">
        <PageHeader
          back
          title="Personal records"
          description={`${records.length} record${records.length !== 1 ? 's' : ''} across all exercises`}
        />

        <div className="mb-4 space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
            <input
              type="search"
              placeholder="Search exercises"
              aria-label="Search personal records"
              value={rawSearch}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input !pl-10"
            />
          </div>

          {/* Record types as chips rather than a native <select>: there are only
              six options, and a dropdown hid all but one of them. */}
          <div className="scroll-touch -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Record type">
            {(['all', ...FILTER_TYPES] as TypeFilter[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={typeFilter === t}
                onClick={() => setTypeFilter(t)}
                className="chip shrink-0"
              >
                {t === 'all' ? 'All' : label(t)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-600">
            <span className="mr-1">Sort</span>
            {(['date', 'value', 'exercise'] as SortOption[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleSort(option)}
                aria-pressed={sortBy === option}
                className={`tap-control inline-flex min-h-[32px] items-center gap-1 rounded-md px-2 font-medium transition-colors ${
                  sortBy === option
                    ? 'text-surface-50 dark:text-white'
                    : 'hover:text-surface-50 dark:hover:text-white'
                }`}
              >
                {SORT_LABELS[option]} {sortIcon(option)}
              </button>
            ))}
          </div>
        </div>

        {isError ? (
          <ErrorState what="your personal records" onRetry={() => refetch()} isRetrying={isFetching} />
        ) : isLoading ? (
          <div className="forge-card p-10 text-center text-sm text-surface-500" role="status">
            Loading records…
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={TrophyIcon}
            title={search || typeFilter !== 'all' ? 'No records match' : 'No personal records yet'}
            hint={
              search || typeFilter !== 'all'
                ? 'Try another exercise name or record type.'
                : 'Your first logged workout sets the baseline.'
            }
          />
        ) : (
          <ul className={`forge-card row-list px-4 sm:px-5 ${isStaleSearch ? 'opacity-60 transition-opacity' : ''}`}>
            {sorted.map((record, i) => (
              <motion.li
                key={`${record.exerciseKey}_${record.type}`}
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                animate={prefersReducedMotion ? {} : { opacity: 1 }}
                transition={{ ...springSnappy, delay: prefersReducedMotion ? 0 : Math.min(i * 0.02, 0.2) }}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/exercise/${encodeURIComponent(record.exerciseName)}`}
                    className="block truncate text-sm font-medium text-surface-50 hover:text-accent-600 dark:text-white dark:hover:text-accent-400"
                  >
                    {record.exerciseName}
                  </Link>
                  <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-600">
                    {label(record.type)} · {formatDate(record.achievedAt)}
                  </p>
                </div>
                <p className="figure shrink-0 text-base">
                  {formatPRValue(record.value, prTypeFromApi(record.type), useMetric)}
                </p>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
