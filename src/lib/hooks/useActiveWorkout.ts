'use client';

/**
 * The active-workout state moved to a provider so the global indicator and the
 * session page share one copy — see components/workout/ActiveWorkoutProvider.
 * This module stays as the import path the rest of the app already uses.
 */
export {
  useActiveWorkout,
  ActiveWorkoutProvider,
  type SyncState,
} from '@/components/workout/ActiveWorkoutProvider';
