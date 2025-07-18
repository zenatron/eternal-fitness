'use client';

// 🚀 STREAMLINED ACTIVE WORKOUT HOOK
// Uses the new unified session hooks for consistent data management

export {
  useActiveSession as useActiveWorkout,
  useStartSession,
  useUpdateActiveSession,
  useCompleteSession,
  usePauseResumeSession,
  useCancelSession,
  useRecoverSession
} from './session-hooks';

// Legacy compatibility - for components that expect the old interface
import { useActiveSession } from './session-hooks';
import { useState, useEffect, useRef, useCallback } from 'react';

export function useActiveWorkoutLegacy() {
  const { data: activeSessionData, isLoading } = useActiveSession();
  const [currentTime, setCurrentTime] = useState<string>('0:00');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    const activeWorkout = activeSessionData?.data?.activeSession || activeSessionData;

    const updateTimer = () => {
      if (activeWorkout) {
        const elapsed = getElapsedSeconds(activeWorkout);
        setCurrentTime(formatTime(elapsed));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSessionData, getElapsedSeconds, formatTime]);

  const activeWorkout = activeSessionData?.data?.activeSession || activeSessionData;

  return {
    activeWorkout,
    isLoading,
    formatWorkoutDuration: currentTime,
    hasActiveWorkout: !!activeWorkout,
    isTimerActive: activeWorkout?.isTimerActive || false,
    getWorkoutDuration: () => activeWorkout ? getElapsedSeconds(activeWorkout) : 0,
  };
}
