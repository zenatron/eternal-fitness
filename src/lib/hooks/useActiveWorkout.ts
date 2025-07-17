'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkoutTemplateData, ExercisePerformance, ActiveWorkoutSessionData, ActiveSessionUpdatePayload } from '@/types/workout';

// Removed legacy localStorage support - all session data now stored server-side

export function useActiveWorkout() {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutSessionData | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('0:00');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // API functions for server sync
  const fetchActiveSession = useCallback(async (): Promise<ActiveWorkoutSessionData | null> => {
    try {
      const response = await fetch('/api/session/active');
      if (!response.ok) throw new Error('Failed to fetch active session');
      const result = await response.json();
      return result.data.activeSession;
    } catch (error) {
      console.error('Error fetching active session:', error);
      return null;
    }
  }, []);

  const syncToServer = useCallback(async (updates: ActiveSessionUpdatePayload) => {
    if (isSyncing) return; // Prevent concurrent syncs

    setIsSyncing(true);
    try {
      const response = await fetch('/api/session/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to sync to server');
      const result = await response.json();
      return result.data.activeSession;
    } catch (error) {
      console.error('Error syncing to server:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Debounced sync function
  const debouncedSync = useCallback((updates: ActiveSessionUpdatePayload) => {
    console.log('⏱️ debouncedSync called with:', JSON.stringify(updates, null, 2));
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      console.log('🚀 Syncing to server after debounce:', JSON.stringify(updates, null, 2));
      syncToServer(updates).catch(console.error);
    }, 1000); // Sync after 1 second of inactivity
  }, [syncToServer]);

  // Calculate elapsed time in seconds
  const getElapsedSeconds = useCallback((workout: ActiveWorkoutSessionData): number => {
    if (!workout) return 0;

    const now = Date.now();
    const startTime = new Date(workout.startedAt).getTime();
    let totalElapsed = workout.pausedTime; // Start with previously paused time

    if (workout.isTimerActive) {
      // Add time since last start/resume
      totalElapsed += Math.floor((now - startTime) / 1000);
    } else if (workout.lastPauseTime) {
      // Timer is paused, add time from start to last pause
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
      }
    };

    // Update immediately
    updateTimer();

    // Set up interval for continuous updates
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout, getElapsedSeconds, formatTime]);

  // Load active workout from server on mount
  useEffect(() => {
    const loadActiveSession = async () => {
      setIsLoading(true);
      try {
        const serverSession = await fetchActiveSession();
        if (serverSession) {
          setActiveWorkout(serverSession);
        }
      } catch (error) {
        console.error('Error loading active session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActiveSession();
  }, [fetchActiveSession]);

  const startWorkout = useCallback(async (
    templateId: string,
    templateName: string,
    template?: WorkoutTemplateData
  ) => {
    try {
      const response = await fetch('/api/session/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          templateName,
          template,
        }),
      });

      if (!response.ok) throw new Error('Failed to start workout session');

      const result = await response.json();
      setActiveWorkout(result.data.activeSession);
    } catch (error) {
      console.error('Error starting workout:', error);
      throw error;
    }
  }, []);

  const updateWorkout = useCallback((updates: ActiveSessionUpdatePayload) => {
    console.log('💾 updateWorkout called with updates:', JSON.stringify(updates, null, 2));
    setActiveWorkout(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      console.log('💾 Updated active workout state:', JSON.stringify(updated, null, 2));
      // Debounced sync to server
      debouncedSync(updates);
      return updated;
    });
  }, [debouncedSync]);

  const updatePerformance = useCallback((performance: { [exerciseId: string]: ExercisePerformance }) => {
    console.log('🔄 updatePerformance called with:', JSON.stringify(performance, null, 2));
    updateWorkout({ performance });
  }, [updateWorkout]);

  const updateExerciseProgress = useCallback((exerciseProgress: { [exerciseId: string]: any }) => {
    updateWorkout({ exerciseProgress });
  }, [updateWorkout]);

  const updateSessionNotes = useCallback((sessionNotes: string) => {
    updateWorkout({ sessionNotes });
  }, [updateWorkout]);

  const updateModifiedTemplate = useCallback((modifiedTemplate: WorkoutTemplateData) => {
    updateWorkout({ modifiedTemplate });
  }, [updateWorkout]);

  const toggleTimer = useCallback(() => {
    if (!activeWorkout) return;

    const now = new Date();
    const startTime = new Date(activeWorkout.startedAt).getTime();

    if (activeWorkout.isTimerActive) {
      // Pausing: calculate and store total paused time
      const sessionTime = Math.floor((now.getTime() - startTime) / 1000);
      updateWorkout({
        isTimerActive: false,
        pausedTime: activeWorkout.pausedTime + sessionTime,
        lastPauseTime: now
      });
    } else {
      // Resuming: clear pause time
      updateWorkout({
        isTimerActive: true,
        lastPauseTime: undefined
      });
    }
  }, [activeWorkout, updateWorkout]);

  const endWorkout = useCallback(async () => {
    try {
      await fetch('/api/session/active', { method: 'DELETE' });
      setActiveWorkout(null);
      // Clear any remaining localStorage data
      // Legacy localStorage cleanup no longer needed
    } catch (error) {
      console.error('Error ending workout:', error);
      // Still clear local state even if server call fails
      setActiveWorkout(null);
    }
  }, []);

  const completeWorkout = useCallback(async (duration?: number, notes?: string) => {
    try {
      const response = await fetch('/api/session/active/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration, notes }),
      });

      if (!response.ok) throw new Error('Failed to complete workout');

      const data = await response.json();
      setActiveWorkout(null);
      return data;
    } catch (error) {
      console.error('Error completing workout:', error);
      throw error;
    }
  }, []);

  const recoverSession = useCallback(async (templateId: string, forceRecover = false) => {
    try {
      const response = await fetch('/api/session/active/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, forceRecover }),
      });

      if (!response.ok) throw new Error('Failed to recover session');

      const result = await response.json();
      if (result.data.activeSession) {
        setActiveWorkout(result.data.activeSession);
      } else {
        setActiveWorkout(null);
      }
      return result.data;
    } catch (error) {
      console.error('Error recovering session:', error);
      throw error;
    }
  }, []);

  const getWorkoutDuration = useCallback(() => {
    if (!activeWorkout) return 0;
    return getElapsedSeconds(activeWorkout);
  }, [activeWorkout, getElapsedSeconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    activeWorkout,
    isLoading,
    isSyncing,
    startWorkout,
    updateWorkout,
    updatePerformance,
    updateExerciseProgress,
    updateSessionNotes,
    updateModifiedTemplate,
    toggleTimer,
    endWorkout,
    completeWorkout,
    recoverSession,
    getWorkoutDuration,
    formatWorkoutDuration: currentTime, // Return the live-updating time string
    hasActiveWorkout: !!activeWorkout,
    isTimerActive: activeWorkout?.isTimerActive || false,
  };
}
