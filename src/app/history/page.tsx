'use client';

import { useMemo, useState } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

import {
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
import { formatDurationCompact } from '@/utils/durationUtils';
import { WorkoutSessionData } from '@/types/workout';

import toast from 'react-hot-toast';
import { sessionDisplayName } from '@/utils/sessionName';
import { PageHeader } from '@/components/ui/PageHeader';

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
  snapshotName?: string | null;
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
  const { profile } = useProfile();
  const useMetric = profile?.useMetric ?? false;
  const deleteSession = useDeleteSession();

  const [search, setSearch] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<HistorySession | null>(null);
  const /** Full session fetched on demand for the edit modal. */
    [editingSession, setEditingSession] = useState<FullSession | null>(null);
  const [isLoadingForEdit, setIsLoadingForEdit] = useState(false);
  /** Which row's edit fetch is in flight — disabling every row's button greyed out the whole list for one request. */
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

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
        sessionDisplayName(session).toLowerCase().includes(q) ||
        session.notes?.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const openEditor = async (session: HistorySession) => {
    setIsLoadingForEdit(true);
    setEditingSessionId(session.id);
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
        templateName: sessionDisplayName(full),
      });
    } catch {
      toast.error('Could not open that workout for editing.');
    } finally {
      setIsLoadingForEdit(false);
      setEditingSessionId(null);
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
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <PageHeader back title="History" description="Every workout you have logged. Edit or delete any of them." />

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 dark:text-surface-600" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search loaded workouts…"
          aria-label="Search workout history"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-surface-100 text-sm text-surface-50 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
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
              <div className="h-4 w-1/3 bg-black/[0.06] dark:bg-white/[0.06] rounded mb-2" />
              <div className="h-3 w-1/2 bg-black/[0.05] dark:bg-white/[0.05] rounded" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState what="your workout history" onRetry={() => refetch()} isRetrying={isFetching} />
      ) : filtered.length === 0 ? (
        <div className="forge-card p-10 text-center">
          <p className="text-lg text-surface-50 dark:text-white">
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
          <ul className="forge-card divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {filtered.map((session) => {
              const name = sessionDisplayName(session);
              return (
                <li key={session.id} className="flex items-center gap-2 py-2.5 pl-4 pr-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-surface-50 dark:text-white">{name}</p>
                    <p className="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-600 tabular">
                      {session.completedAt ? formatSessionDateTime(session.completedAt) : 'Unfinished'}
                      {' · '}
                      {formatDurationCompact(session.duration || 0)}
                      {' · '}
                      {session.totalSets} {session.totalSets === 1 ? 'set' : 'sets'}
                      {session.totalVolume > 0 && <> · {formatVolume(session.totalVolume, useMetric)}</>}
                    </p>
                  </div>
                  <button
                    onClick={() => void openEditor(session)}
                    disabled={isLoadingForEdit && editingSessionId === session.id}
                    aria-label={`Edit ${name}`}
                    title="Edit"
                    className="touch-target tap-control flex shrink-0 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-black/[0.05] hover:text-surface-50 disabled:opacity-50 dark:text-surface-600 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  >
                    <PencilSquareIcon className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={() => setSessionToDelete(session)}
                    aria-label={`Delete ${name}`}
                    title="Delete"
                    className="touch-target tap-control flex shrink-0 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-danger-500/10 hover:text-danger-500 dark:text-surface-600"
                  >
                    <TrashIcon className="h-[18px] w-[18px]" />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* The Load more button stays visible while searching: the empty
              state tells the user to "load more to search further back", and
              hiding the only control that does so left them stranded. */}
          {hasNextPage && (
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
              That&apos;s everything.
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        open={sessionToDelete !== null}
        title="Delete this workout?"
        message={`"${
          sessionToDelete ? sessionDisplayName(sessionToDelete) : ''
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
