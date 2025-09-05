'use client';

// 🚀 STREAMLINED ACTIVE WORKOUT HOOK
// Uses the new unified session hooks for consistent data management

import { useActiveSession, useCancelSession } from './session-hooks';
import { useState, useEffect, useCallback } from 'react';

// Re-export session hooks for convenience
export {
  useActiveSession,
  useStartSession,
  useUpdateActiveSession,
  useCompleteSession,
  usePauseResumeSession,
  useCancelSession,
  useRecoverSession
} from './session-hooks';

/**
 * Enhanced active workout hook with timer functionality
 * Provides a clean interface for components that need timer display
 */
export function useActiveWorkout() {
  const { data: activeSessionResponse, isLoading } = useActiveSession();
  const cancelWorkoutMutation = useCancelSession();
  const [currentTime, setCurrentTime] = useState<string>('0:00');

  // Extract active workout from the standardized API response structure
  const activeWorkout = activeSessionResponse?.data?.activeSession;

  // Calculate elapsed time in seconds
  const getElapsedSeconds = useCallback((workout: any): number => {
    if (!workout) return 0;

    const now = Date.now();
    const startTime = new Date(workout.startedAt).getTime();
    let totalElapsed = workout.pausedTime || 0;

    if (workout.isTimerActive) {
      totalElapsed += Math.floor((now - startTime) / 1000);
    } else if (workout.lastPauseTime) {
      totalElapsed += Math.floor((new Date(workout.lastPauseTime).getTime() - startTime) / 1000);
    }

    return Math.max(0, totalElapsed);
  }, []);

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Update timer display every second
  useEffect(() => {
    const updateTimer = () => {
      if (activeWorkout) {
        const elapsed = getElapsedSeconds(activeWorkout);
        setCurrentTime(formatTime(elapsed));
      } else {
        setCurrentTime('0:00');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout, getElapsedSeconds, formatTime]);

  // End workout function
  const endWorkout = useCallback(async () => {
    try {
      await cancelWorkoutMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to end workout:', error);
    }
  }, [cancelWorkoutMutation]);

  return {
    activeWorkout,
    isLoading,
    formatWorkoutDuration: currentTime,
    hasActiveWorkout: !!activeWorkout,
    isTimerActive: activeWorkout?.isTimerActive || false,
    getWorkoutDuration: () => activeWorkout ? getElapsedSeconds(activeWorkout) : 0,
    endWorkout,
  };
}
