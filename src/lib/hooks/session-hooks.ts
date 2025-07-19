// 🚀 SESSION-SPECIFIC HOOKS
// Specialized hooks for workout session CRUD operations

import { useApiQuery, useApiMutation, useApiUpdateMutation, useApiPatchMutation } from './api-hooks';
import { WorkoutSession, ActiveWorkoutSessionData } from '@/types/workout';

// ============================================================================
// SESSION QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch all workout sessions for the current user
 */
export function useSessions() {
  return useApiQuery<WorkoutSession[]>(['session'], '/session', undefined, {
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch a single workout session by ID
 */
export function useSession(sessionId: string) {
  return useApiQuery<WorkoutSession>(['session', sessionId], `/session/${sessionId}`, undefined, {
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch recent workout sessions
 */
export function useRecentSessions(limit = 10) {
  return useApiQuery<WorkoutSession[]>(['session', 'recent'], '/session', { limit }, {
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch scheduled workout sessions
 */
export function useScheduledSessions() {
  return useApiQuery<WorkoutSession[]>(['session', 'scheduled'], '/session/scheduled', undefined, {
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// ACTIVE SESSION HOOKS
// ============================================================================

/**
 * Hook to fetch the current active workout session
 */
export function useActiveSession() {
  return useApiQuery<ActiveWorkoutSessionData | null>(['session', 'active'], '/session/active', undefined, {
    staleTime: 0, // Always fresh for active sessions
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

/**
 * Hook to start a new workout session
 */
export function useStartSession() {
  return useApiMutation<ActiveWorkoutSessionData>('/session/active', {
    successMessage: 'Workout session started!',
    invalidateQueries: ['session'],
  });
}

/**
 * Hook to update an active workout session
 */
export function useUpdateActiveSession() {
  return useApiPatchMutation<ActiveWorkoutSessionData>('/session/active', {
    invalidateQueries: ['session'],
    // No success message for frequent updates
  });
}

/**
 * Hook to complete an active workout session
 */
export function useCompleteSession() {
  return useApiMutation<WorkoutSession>('/session/active/complete', {
    successMessage: 'Workout completed successfully!',
    invalidateQueries: ['session', ['session', 'scheduled'], ['user', 'stats']],
  });
}

/**
 * Hook to pause/resume an active workout session
 */
export function usePauseResumeSession() {
  return useApiPatchMutation<ActiveWorkoutSessionData>('/session/active', {
    invalidateQueries: ['session'],
  });
}

/**
 * Hook to cancel/abandon an active workout session
 */
export function useCancelSession() {
  return useApiMutation<void>('/session/active', {
    successMessage: 'Workout session cancelled',
    invalidateQueries: ['session'],
  });
}

// ============================================================================
// SESSION MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new workout session (from template)
 */
export function useCreateSession() {
  return useApiMutation<WorkoutSession>('/session', {
    successMessage: 'Workout session created!',
    invalidateQueries: ['session', ['session', 'scheduled'], ['user', 'stats']],
  });
}

/**
 * Hook to update an existing workout session
 */
export function useUpdateSession(sessionId: string) {
  return useApiUpdateMutation<WorkoutSession>(`/session/${sessionId}`, {
    successMessage: 'Session updated successfully!',
    invalidateQueries: ['session'],
  });
}

/**
 * Hook to delete a workout session
 */
export function useDeleteSession(sessionId: string) {
  return useApiMutation<void>(`/session/${sessionId}`, {
    successMessage: 'Session deleted successfully!',
    invalidateQueries: ['session'],
  });
}

// ============================================================================
// SESSION RECOVERY HOOKS
// ============================================================================

/**
 * Hook to recover a lost active session
 */
export function useRecoverSession() {
  return useApiMutation<ActiveWorkoutSessionData>('/session/active/recover', {
    successMessage: 'Session recovered successfully!',
    invalidateQueries: ['session'],
  });
}
