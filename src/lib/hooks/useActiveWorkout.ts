'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorkoutTemplateData, ExercisePerformance } from '@/types/workout';

interface ActiveWorkoutState {
  templateId: string;
  templateName: string;
  startTime: number;
  elapsedTime: number;
  isActive: boolean;
  sessionNotes: string;
  workoutPerformance: { [exerciseId: string]: ExercisePerformance };
  modifiedTemplate?: WorkoutTemplateData;
  exerciseProgress?: { [exerciseId: string]: any };
}

const ACTIVE_WORKOUT_KEY = 'eternal-fitness-active-workout';

export function useActiveWorkout() {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null);

  // Load active workout from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_WORKOUT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActiveWorkout(parsed);
      } catch (error) {
        console.error('Failed to parse active workout from localStorage:', error);
        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
      }
    }
  }, []);

  // Save to localStorage whenever activeWorkout changes
  useEffect(() => {
    if (activeWorkout) {
      localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(activeWorkout));
    } else {
      localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    }
  }, [activeWorkout]);

  const startWorkout = useCallback((
    templateId: string,
    templateName: string,
    template?: WorkoutTemplateData
  ) => {
    const newWorkout: ActiveWorkoutState = {
      templateId,
      templateName,
      startTime: Date.now(),
      elapsedTime: 0,
      isActive: true,
      sessionNotes: '',
      workoutPerformance: {},
      modifiedTemplate: template,
      exerciseProgress: {},
    };
    setActiveWorkout(newWorkout);
  }, []);

  const updateWorkout = useCallback((updates: Partial<ActiveWorkoutState>) => {
    setActiveWorkout(prev => prev ? { ...prev, ...updates } : null);
  }, []); // Removed activeWorkout dependency

  const updateElapsedTime = useCallback((elapsedTime: number) => {
    updateWorkout({ elapsedTime });
  }, [updateWorkout]);

  const updatePerformance = useCallback((performance: { [exerciseId: string]: ExercisePerformance }) => {
    updateWorkout({ workoutPerformance: performance });
  }, [updateWorkout]);

  const updateExerciseProgress = useCallback((progress: { [exerciseId: string]: any }) => {
    updateWorkout({ exerciseProgress: progress });
  }, [updateWorkout]);

  const updateSessionNotes = useCallback((notes: string) => {
    updateWorkout({ sessionNotes: notes });
  }, [updateWorkout]);

  const updateModifiedTemplate = useCallback((template: WorkoutTemplateData) => {
    updateWorkout({ modifiedTemplate: template });
  }, [updateWorkout]);

  const pauseWorkout = useCallback(() => {
    updateWorkout({ isActive: false });
  }, [updateWorkout]);

  const resumeWorkout = useCallback(() => {
    updateWorkout({ isActive: true });
  }, [updateWorkout]);

  const endWorkout = useCallback(() => {
    setActiveWorkout(null);
    // Also explicitly clear localStorage to ensure it's removed
    localStorage.removeItem(ACTIVE_WORKOUT_KEY);
  }, []);

  const getWorkoutDuration = useCallback(() => {
    if (!activeWorkout) return 0;
    return Math.floor((Date.now() - activeWorkout.startTime) / 1000);
  }, [activeWorkout]);

  const formatWorkoutDuration = useCallback(() => {
    const duration = getWorkoutDuration();
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [getWorkoutDuration]);

  return {
    activeWorkout,
    startWorkout,
    updateWorkout,
    updateElapsedTime,
    updatePerformance,
    updateExerciseProgress,
    updateSessionNotes,
    updateModifiedTemplate,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    getWorkoutDuration,
    formatWorkoutDuration,
    hasActiveWorkout: !!activeWorkout,
  };
}
