// 🚀 JSON WORKOUT UTILITIES
// Comprehensive utilities for working with JSON-based workout data

import { performedSetsVolume, targetSetVolume } from '@/lib/volume';
import {
  WorkoutTemplateData,
  WorkoutSessionData,
  WorkoutExercise,
  ExercisePerformance,
  PerformedSet,
  SessionMetrics,
  LegacyPersonalRecord,
  LegacyVolumeRecord,
  SetType,
  WorkoutType,
  Difficulty,
} from '@/types/workout';

// ============================================================================
// WORKOUT TEMPLATE UTILITIES
// ============================================================================

/**
 * Creates a new workout template with proper structure and defaults
 */
export function createWorkoutTemplate(
  name: string,
  exercises: Array<{
    exerciseKey: string;
    name: string;
    muscles: string[];
    equipment: string[];
    sets: Array<{
      reps: number;
      weight?: number;
      duration?: number;
      distance?: number;
      type?: SetType;
      restTime?: number;
      notes?: string;
    }>;
    instructions?: string;
    restBetweenSets?: number;
    perSide?: boolean;
  }>,
  options: {
    description?: string;
    tags?: string[];
    workoutType?: WorkoutType;
    difficulty?: Difficulty;
  } = {}
): WorkoutTemplateData {
  const workoutExercises: WorkoutExercise[] = exercises.map((ex, exIndex) => ({
    id: `exercise-${exIndex + 1}`,
    exerciseKey: ex.exerciseKey,
    name: ex.name,
    muscles: ex.muscles,
    equipment: ex.equipment,
    perSide: ex.perSide,
    sets: ex.sets.map((set, setIndex) => ({
      id: `set-${setIndex + 1}`,
      type: set.type || SetType.STANDARD,
      targetReps: set.reps,
      targetWeight: set.weight,
      targetDuration: set.duration,
      targetDistance: set.distance,
      restTime: set.restTime ?? 60,
      notes: set.notes,
    })),
    instructions: ex.instructions,
    restBetweenSets: ex.restBetweenSets ?? 60,
  }));

  const estimatedDuration = calculateEstimatedDuration(workoutExercises);

  return {
    metadata: {
      name,
      description: options.description,
      tags: options.tags || [],
      estimatedDuration,
      difficulty: options.difficulty || Difficulty.INTERMEDIATE,
      workoutType: options.workoutType || WorkoutType.STRENGTH,
      targetMuscleGroups: extractMuscleGroups(workoutExercises),
      equipment: extractEquipment(workoutExercises),
    },
    exercises: workoutExercises,
    structure: {
      main: workoutExercises.map(ex => ex.id),
    },
  };
}

/**
 * Calculates total volume for a workout template
 */
export function calculateTemplateVolume(exercises: WorkoutExercise[]): number {
  return exercises.reduce((total, exercise) => {
    const exerciseVolume = exercise.sets.reduce(
      (setTotal, set) => setTotal + targetSetVolume(set, exercise.perSide),
      0
    );
    return total + exerciseVolume;
  }, 0);
}

/**
 * Estimates workout duration based on sets and rest times
 */
export function calculateEstimatedDuration(exercises: WorkoutExercise[]): number {
  let totalSeconds = 0;

  exercises.forEach(exercise => {
    const fallbackRest = exercise.restBetweenSets || 60;
    exercise.sets.forEach((set, i) => {
      if (set.targetDuration) {
        totalSeconds += set.targetDuration;
      } else {
        const reps = typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.max || 0;
        totalSeconds += reps * 3;
      }
      if (i < exercise.sets.length - 1) {
        totalSeconds += set.restTime ?? fallbackRest;
      }
    });
  });

  return Math.round(totalSeconds / 60 + 5);
}

/**
 * Extracts unique muscle groups from exercises
 */
export function extractMuscleGroups(exercises: WorkoutExercise[]): string[] {
  const muscles = new Set<string>();
  exercises.forEach(ex => ex.muscles.forEach(muscle => muscles.add(muscle)));
  return Array.from(muscles);
}

/**
 * Extracts unique equipment from exercises
 */
export function extractEquipment(exercises: WorkoutExercise[]): string[] {
  const equipment = new Set<string>();
  exercises.forEach(ex => ex.equipment.forEach(eq => equipment.add(eq)));
  return Array.from(equipment);
}

// ============================================================================
// WORKOUT SESSION UTILITIES
// ============================================================================

/**
 * Creates a new workout session performance data structure
 */
export function createWorkoutSession(
  template: WorkoutTemplateData,
  performance: { [exerciseId: string]: ExercisePerformance }
): WorkoutSessionData {
  const metrics = calculateSessionMetrics(performance);
  
  return {
    templateSnapshot: template,
    performance,
    metrics,
    timeline: [], // Will be populated during workout
  };
}

/**
 * Calculates comprehensive session metrics from performance data
 */
export function calculateSessionMetrics(
  performance: { [exerciseId: string]: ExercisePerformance }
): SessionMetrics {
  let totalVolume = 0;
  let totalSets = 0;
  let completedSets = 0;
  let skippedSets = 0;
  let totalRpe = 0;
  let rpeCount = 0;
  const personalRecords: LegacyPersonalRecord[] = [];
  const volumeRecords: LegacyVolumeRecord[] = [];

  Object.values(performance).forEach(exercisePerf => {
    totalVolume += exercisePerf.totalVolume;
    
    exercisePerf.sets.forEach(set => {
      totalSets++;
      if (set.completed) {
        completedSets++;
      }
      if (set.skipped) {
        skippedSets++;
      }
      if (set.actualRpe) {
        totalRpe += set.actualRpe;
        rpeCount++;
      }
    });

    // Add any personal records from this exercise
    if (exercisePerf.personalRecords) {
      personalRecords.push(...exercisePerf.personalRecords);
    }
  });

  const adherenceScore = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const averageRpe = rpeCount > 0 ? totalRpe / rpeCount : undefined;

  return {
    totalVolume,
    totalSets,
    totalExercises: Object.keys(performance).length,
    completedSets,
    skippedSets,
    averageRpe,
    maxRpe: rpeCount > 0 ? Math.max(...Object.values(performance).flatMap(p => 
      p.sets.map(s => s.actualRpe || 0).filter(rpe => rpe > 0)
    )) : undefined,
    personalRecords,
    volumeRecords,
    adherenceScore,
  };
}

/**
 * Calculates volume for a single exercise performance
 */
export function calculateExerciseVolume(sets: PerformedSet[], perSide?: boolean): number {
  return performedSetsVolume(sets, perSide);
}

/**
 * Converts exerciseProgress format to ExercisePerformance format
 * This is needed because the UI stores data in exerciseProgress format
 * but metrics calculation expects ExercisePerformance format
 */
export function convertExerciseProgressToPerformance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exerciseProgress: { [exerciseId: string]: any },
  template: WorkoutTemplateData
): { [exerciseId: string]: ExercisePerformance } {
  const performance: { [exerciseId: string]: ExercisePerformance } = {};

  Object.values(exerciseProgress).forEach((progress) => {
    const exercise = template.exercises.find(ex => ex.id === progress.exerciseId);
    if (!exercise) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const performedSets: PerformedSet[] = progress.sets.map((setProgress: any) => ({
      setId: setProgress.setId,
      actualReps: setProgress.actualReps,
      actualWeight: setProgress.actualWeight,
      actualDuration: setProgress.actualDuration,
      actualDistance: setProgress.actualDistance,
      actualRpe: setProgress.actualRpe,
      completed: setProgress.completed,
      skipped: setProgress.skipped || false,
      notes: setProgress.notes,
      restTime: setProgress.restTime,
    }));

    const totalVolume = performedSetsVolume(performedSets, exercise.perSide);

    const completedSets = performedSets.filter(set => set.completed);
    const averageRpe = completedSets.length > 0
      ? completedSets.reduce((sum, set) => sum + (set.actualRpe || 0), 0) / completedSets.length
      : undefined;

    performance[progress.exerciseId] = {
      exerciseKey: exercise.exerciseKey,
      perSide: exercise.perSide,
      sets: performedSets,
      exerciseNotes: progress.exerciseNotes,
      totalVolume,
      averageRpe,
    };
  });

  return performance;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates workout template data structure
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateWorkoutTemplate(data: any): data is WorkoutTemplateData {
  if (!data || typeof data !== 'object') return false;
  if (!data.metadata || !data.exercises || !Array.isArray(data.exercises)) return false;
  if (!data.metadata.name || typeof data.metadata.name !== 'string') return false;
  
  // Validate exercises
  for (const exercise of data.exercises) {
    if (!exercise.id || !exercise.exerciseKey || !exercise.name) return false;
    if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) return false;
    
    // Validate sets
    for (const set of exercise.sets) {
      if (!set.id || !set.type) return false;
      if (typeof set.targetReps !== 'number' && typeof set.targetReps !== 'object') return false;
    }
  }
  
  return true;
}

/**
 * Validates workout session performance data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateWorkoutSession(data: any): data is WorkoutSessionData {
  if (!data || typeof data !== 'object') return false;
  if (!data.templateSnapshot || !data.performance || !data.metrics) return false;
  
  // Validate template snapshot
  if (!validateWorkoutTemplate(data.templateSnapshot)) return false;
  
  // Validate performance data
  if (typeof data.performance !== 'object') return false;
  
  return true;
}
