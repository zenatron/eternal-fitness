'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeftIcon,
  TrophyIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useProfile } from '@/lib/hooks/useProfile';
import { formatPRValue, prTypeFromApi, PR_TYPE_LABELS, PR_TYPE_ICONS } from '@/utils/prFormatting';
import { springSnappy, springGentle } from '@/lib/motion';


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
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PersonalRecordsPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { profile } = useProfile();
  const useMetric = profile?.useMetric ?? false;

  const [records, setRecords] = useState<PRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    params.set('sort', sortBy);

    setIsLoading(true);
    fetch(`/api/personal-records?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        let sorted = (data.records || []) as PRRecord[];
        if (sortDir === 'asc') {
          if (sortBy === 'date') sorted = sorted.reverse();
          else sorted = [...sorted].reverse();
        }
        setRecords(sorted);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [search, typeFilter, sortBy, sortDir]);

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
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="app-bg py-8 px-4"
    >
      <div className="max-w-4xl mx-auto">
        <div className="forge-card overflow-hidden mb-6">
          <div className="relative px-8 py-8 text-white greeting-gradient">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative flex items-center gap-4">
              <motion.button
                onClick={() => router.back()}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                transition={springSnappy}
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </motion.button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-wide uppercase flex items-center gap-3">
                  <TrophyIcon className="w-8 h-8" />
                  Personal Records
                </h1>
                <p className="text-accent-100 text-sm mt-1">
                  {records.length} record{records.length !== 1 ? 's' : ''} set across all exercises
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="forge-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                type="text"
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input !pl-10"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="form-select !py-2 w-full sm:w-44"
            >
              <option value="all">All Types</option>
              {FILTER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {label(t)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 mt-4 text-xs font-display uppercase tracking-wider">
            <button
              onClick={() => toggleSort('date')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                sortBy === 'date' 
                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400' 
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-400'
              }`}
            >
              Date {sortIcon('date')}
            </button>
            <button
              onClick={() => toggleSort('value')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                sortBy === 'value' 
                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400' 
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-400'
              }`}
            >
              Value {sortIcon('value')}
            </button>
            <button
              onClick={() => toggleSort('exercise')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                sortBy === 'exercise' 
                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400' 
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-400'
              }`}
            >
              Exercise {sortIcon('exercise')}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="forge-card p-12 text-center text-surface-500">
            Loading records...
          </div>
        ) : records.length === 0 ? (
          <div className="forge-card p-12 text-center text-surface-500">
            <TrophyIcon className="w-16 h-16 mx-auto mb-4 text-surface-400" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {records.map((record, i) => (
              <motion.div
                key={`${record.exerciseKey}_${record.type}`}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ ...springSnappy, delay: i * 0.03 }}
                className="forge-card p-5 flex items-center justify-between hover:border-accent-400/30 dark:hover:border-accent-500/20"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{icon(record.type)}</span>
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
    </motion.div>
  );
}
