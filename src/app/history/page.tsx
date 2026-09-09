'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeftIcon,
  ClockIcon,
  FireIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EditSessionModal } from '@/components/modals/EditSessionModal';
import { useDeleteSession } from '@/lib/hooks/useMutations';
import { useProfile } from '@/lib/hooks/useProfile';
import { formatVolume } from '@/utils/formatters';
import { formatSessionDateTime } from '@/utils/relativeTime';
import { formatDurationHuman } from '@/utils/durationUtils';
import { WorkoutSessionData } from '@/types/workout';
import { springSnappy, springGentle } from '@/lib/motion';
import toast from 'react-hot-toast';

/**
 * Browsable history of completed workouts.
 *
 * History used to exist only behind Profile → Activity, which capped it at a
 * handful of recent sessions and offered no way to find an older workout. This
 * page pages through the whole history ("Load more" with a server-side keyset
 * cursor), searches what is loaded, and edits or deletes any session.
 */

const PAGE_SIZE = 30;

/** Projection of GET /api/session-json (performanceData deliberately excluded). */
interface HistorySession {
  id: string;
  completedAt: string | null;
  duration: number | null;
  notes: string | null;
  totalVolume: number;
  totalSets: number;
  totalExercises: number;
  workoutTemplateId: string | null;
  workoutTemplate?: { id: string; name: string } | null;
}

interface HistoryPage {
  sessions: HistorySession[];
  nextCursor: string | null;
}

/**
 * A single session's full row, shaped for the edit modal (this list only ever
 * opens completed sessions, so the modal's non-null fields are guaranteed).
 */
interface FullSession extends Omit<HistorySession, 'completedAt' | 'duration' | 'notes'> {
  completedAt: string;
  duration: number;
  notes?: string;
  templateName: string;
  performanceData?: WorkoutSessionData;
}

export default function HistoryPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { profile } = useProfile();
  const useMetric = profile?.useMetric ?? true;
  const deleteSession = useDeleteSession();

  const [search, setSearch] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<HistorySession | null>(null);
  const /** Full session fetched on demand for the edit modal. */
    [editingSession, setEditingSession] = useState<FullSession | null>(null);
  const [isLoadingForEdit, setIsLoadingForEdit] = useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<HistoryPage>({
    queryKey: queryKeys.history,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam ? `&before=${encodeURIComponent(String(pageParam))}` : '';
      const response = await fetch(`/api/session-json?limit=${PAGE_SIZE}${cursor}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to load history');
      }
      const result = await response.json();
      return result.data as HistoryPage;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60 * 1000,
  });

  const sessions = useMemo(() => data?.pages.flatMap((page) => page.sessions) ?? [], [data]);

  // Client-side filter over what is loaded. The server payload is paged, so the
  // placeholder says so rather than implying a search covered everything.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (session) =>
        session.workoutTemplate?.name?.toLowerCase().includes(q) ||
        session.notes?.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const openEditor = async (session: HistorySession) => {
    setIsLoadingForEdit(true);
    try {
      const response = await fetch(`/api/session/${session.id}`);
      if (!response.ok) throw new Error('Failed to load session');
      const result = await response.json();
      const full = result.data as HistorySession;
      setEditingSession({
        ...full,
        // The edit modal only ever opens completed sessions from this list;
        // normalize its nullable columns to the modal's `| undefined` shape.
        completedAt: full.completedAt ?? new Date().toISOString(),
        duration: full.duration ?? 0,
        notes: full.notes ?? undefined,
        templateName: full.workoutTemplate?.name || 'Quick Workout',
      });
    } catch {
      toast.error('Could not open that workout for editing.');
    } finally {
      setIsLoadingForEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    setSessionToDelete(null);
    try {
      await deleteSession.mutateAsync(sessionToDelete.id);
      toast.success('Workout deleted. Your totals have been updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workout');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 py-4">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="touch-target tap-control flex items-center justify-center rounded-lg hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-surface-600 dark:text-surface-700" />
        </button>
        <h1 className="text-xl font-display font-bold uppercase tracking-wide text-surface-50 dark:text-white">
          History
        </h1>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 dark:text-surface-600" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search loaded workouts…"
          aria-label="Search workout history"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-surface-300 dark:border-surface-400 bg-surface-0 dark:bg-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 tap-control p-1 rounded-full hover:bg-surface-950 dark:hover:bg-surface-200"
          >
            <XMarkIcon className="w-4 h-4 text-surface-500" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading history">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="forge-card p-4 animate-pulse">
              <div className="h-4 w-1/3 bg-surface-200 dark:bg-surface-400/40 rounded mb-2" />
              <div className="h-3 w-1/2 bg-surface-200 dark:bg-surface-400/30 rounded" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState what="your workout history" onRetry={() => refetch()} isRetrying={isFetching} />
      ) : filtered.length === 0 ? (
        <div className="forge-card p-10 text-center">
          <p className="font-display text-lg uppercase tracking-wide text-surface-50 dark:text-white">
            {search ? 'No matches' : 'No workouts yet'}
          </p>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-600">
            {search
              ? 'Nothing in the loaded sessions matches. Load more to search further back.'
              : 'Complete or log your first workout and it will show up here.'}
          </p>
        </div>
      ) : (
        <>
          {search && (
            <p className="mb-2 text-xs text-surface-500 dark:text-surface-600">
              Searching the {sessions.length} loaded workouts — load more to search further back.
            </p>
          )}
          <ul className="space-y-2">
            {filtered.map((session, index) => (
              <motion.li
                key={session.id}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ ...springGentle, delay: prefersReducedMotion ? 0 : Math.min(index * 0.03, 0.3) }}
              >
                <div className="forge-card p-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-display font-bold text-surface-50 dark:text-white">
                      {session.workoutTemplate?.name || 'Quick Workout'}
                    </p>
                    <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-600 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>{session.completedAt ? formatSessionDateTime(session.completedAt) : 'Unfinished'}</span>
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {formatDurationHuman(session.duration || 0)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FireIcon className="w-3 h-3" />
                        {formatVolume(session.totalVolume, useMetric)}
                      </span>
                      <span>{session.totalSets} sets</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => void openEditor(session)}
                      disabled={isLoadingForEdit}
                      aria-label={`Edit ${session.workoutTemplate?.name || 'workout'}`}
                      title="Edit workout"
                      className="touch-target tap-control flex items-center justify-center rounded-lg hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors disabled:opacity-50"
                    >
                      <PencilSquareIcon className="w-4 h-4 text-surface-500 dark:text-surface-600" />
                    </button>
                    <button
                      onClick={() => setSessionToDelete(session)}
                      aria-label={`Delete ${session.workoutTemplate?.name || 'workout'}`}
                      title="Delete workout"
                      className="touch-target tap-control flex items-center justify-center rounded-lg hover:bg-danger-500/10 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 text-danger-400" />
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>

          {hasNextPage && !search && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="btn btn-tertiary w-full mt-4 tap-control disabled:opacity-60"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          )}
          {!hasNextPage && sessions.length > PAGE_SIZE && (
            <p className="mt-4 text-center text-xs text-surface-500 dark:text-surface-600">
              That's your whole history — every workout ever logged.
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        open={sessionToDelete !== null}
        title="Delete this workout?"
        message={`"${
          sessionToDelete?.workoutTemplate?.name || 'Quick Workout'
        }" will be removed and your lifetime totals, monthly stats and streaks will be recalculated. This can't be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setSessionToDelete(null)}
      />

      <EditSessionModal
        isOpen={editingSession !== null}
        onClose={() => setEditingSession(null)}
        session={editingSession}
        useMetric={useMetric}
      />
    </div>
  );
}
