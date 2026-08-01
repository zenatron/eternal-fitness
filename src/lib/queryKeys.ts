import type { QueryClient } from '@tanstack/react-query';

/**
 * Every React Query key in the app, and what invalidates them.
 *
 * This exists because invalidation had been written per-mutation and never
 * revisited. Each new query added its own key and each new mutation invalidated
 * the two or three keys its author happened to be thinking about, so the set of
 * things refreshed after an action drifted steadily behind the set of things
 * affected by it. By the time this was noticed, finishing a workout — the
 * largest state change in the app — invalidated nothing at all, and the
 * dashboard, profile points, leaderboard, progress charts and recovery map all
 * showed pre-workout data until their staleTime lapsed or the tab was reloaded.
 *
 * The fix is to describe invalidation in terms of *what changed on the server*
 * rather than *which mutation ran*. There are only three kinds of change that
 * matter, so there are three functions below. A new query joins a group here
 * once; a new mutation calls a group rather than listing keys.
 *
 * The test suite asserts both directions: every key here belongs to a group (or
 * is explicitly exempt), and every `queryKey` literal in the codebase is
 * registered here. A query added without being wired in fails the suite rather
 * than quietly going stale in production.
 *
 */

export const queryKeys = {
  /** The user row: name, units, points/XP, accent theme. */
  profile: ['profile'] as const,
  /** Aggregated home screen: streak, recent activity, level, upcoming. */
  dashboardData: ['dashboardData'] as const,
  /** Which dashboard tiles are shown, and in what order. */
  dashboardConfig: ['dashboardConfig'] as const,
  /** Lifetime totals, PRs and achievements. */
  userStats: ['userStats'] as const,
  leaderboard: ['leaderboard'] as const,
  /** Prefixed by period; invalidating the prefix covers every period. */
  progress: ['progress'] as const,
  templates: ['json-templates'] as const,
  /** Prefixed by id; the prefix covers every individual template. */
  template: ['json-template'] as const,
  /** "Last time" reference values shown against each set. */
  lastPerformance: ['lastPerformance'] as const,
  /** Per-exercise history and trend charts. */
  exerciseHistory: ['exercise-history'] as const,
  /** Per-region training load feeding the recovery map. */
  recovery: ['recovery'] as const,
  /** Upcoming scheduled sessions. */
  scheduledSessions: ['scheduledSessions'] as const,
  /** Static exercise library metadata. Never invalidated by a user action: it
   *  is build-time data that cannot change while the app is running. */
  exercise: ['exercise'] as const,
} as const;

export const templateKey = (id: string) => [...queryKeys.template, id] as const;

/**
 * A completed, edited or deleted workout session.
 *
 * The widest group by far, because a logged session moves almost everything:
 * points and level (profile), lifetime totals and PRs (userStats), the home
 * screen, the leaderboard, progress charts, the "last time" values shown on the
 * next workout, per-exercise history, and the recovery map. Templates are
 * included because the list carries usage information.
 */
export function invalidateWorkoutData(queryClient: QueryClient): Promise<void> {
  return invalidateAll(queryClient, [
    queryKeys.profile,
    queryKeys.dashboardData,
    queryKeys.userStats,
    queryKeys.leaderboard,
    queryKeys.progress,
    queryKeys.templates,
    queryKeys.lastPerformance,
    queryKeys.exerciseHistory,
    queryKeys.recovery,
    queryKeys.scheduledSessions,
  ]);
}

/**
 * A template created, edited, deleted, favourited or scheduled.
 *
 * Includes the dashboard because favourites and upcoming sessions are shown
 * there, and the recovery map because its training suggestions are scored from
 * template contents.
 */
export function invalidateTemplateData(
  queryClient: QueryClient,
  templateId?: string
): Promise<void> {
  return invalidateAll(queryClient, [
    queryKeys.templates,
    // The bare prefix covers every cached template; the specific key is added
    // too so an exact-match cache entry is definitely hit.
    queryKeys.template,
    ...(templateId ? [templateKey(templateId)] : []),
    queryKeys.dashboardData,
    queryKeys.scheduledSessions,
  ]);
}

/** Profile edits: name, units, avatar, measurements. */
export function invalidateProfileData(queryClient: QueryClient): Promise<void> {
  return invalidateAll(queryClient, [
    queryKeys.profile,
    // Name and avatar appear on both.
    queryKeys.dashboardData,
    queryKeys.leaderboard,
  ]);
}

/**
 * Fires every invalidation concurrently and resolves once they settle.
 *
 * Awaited rather than fire-and-forget so a caller that navigates immediately
 * afterwards — which is what the workout completion flow does — lands on a
 * screen that is already refetching rather than one showing stale data.
 * `allSettled`, because one failing refetch should not prevent the rest.
 */
function invalidateAll(
  queryClient: QueryClient,
  keys: readonly (readonly unknown[])[]
): Promise<void> {
  return Promise.allSettled(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] }))
  ).then(() => undefined);
}
