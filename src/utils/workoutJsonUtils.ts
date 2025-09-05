// 🚀 JSON WORKOUT UTILITIES
// Comprehensive utilities for working with JSON-based workout data

import {
  WorkoutTemplateData,
  WorkoutSessionData,
  WorkoutExercise,
  WorkoutSet,
  ExercisePerformance,
  PerformedSet,
  SessionMetrics,
  PersonalRecord,
  VolumeRecord,
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
      reps?: number;
      weight?: number;
      duration?: number;
      distance?: number;
      calories?: number;
      heartRate?: number;
      pace?: number;
      incline?: number;
      resistance?: number;
      type?: SetType;
    }>;
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
    sets: ex.sets.map((set, setIndex) => ({
      id: `set-${setIndex + 1}`,
      type: set.type || SetType.STANDARD,
      // Strength training targets
      targetReps: set.reps,
      targetWeight: set.weight,
      // Cardio targets
      targetDuration: set.duration,
      targetDistance: set.distance,
      targetCalories: set.calories,
      targetHeartRate: set.heartRate,
      targetPace: set.pace,
      targetIncline: set.incline,
      targetResistance: set.resistance,
      restTime: 60, // default 60 seconds rest
    })),
    restBetweenSets: 60,
  }));

  const totalVolume = calculateTemplateVolume(workoutExercises);
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
 * Calculates total volume for a workout template (handles both strength and cardio)
 */
export function calculateTemplateVolume(exercises: WorkoutExercise[]): number {
  return exercises.reduce((total, exercise) => {
    const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
      // For strength exercises: reps × weight
      if (set.targetReps && set.targetWeight) {
        const reps = typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.min || 0;
        const weight = set.targetWeight || 0;
        return setTotal + (reps * weight);
      }

      // For cardio exercises: use calories as volume metric, or distance × duration factor
      if (set.targetCalories) {
        return setTotal + set.targetCalories;
      }

      if (set.targetDistance && set.targetDuration) {
        // Use distance × time factor as volume metric for cardio
        return setTotal + (set.targetDistance * set.targetDuration / 60); // normalize by minute
      }

      return setTotal;
    }, 0);
    return total + exerciseVolume;
  }, 0);
}

/**
 * Estimates workout duration based on sets and rest times
 */
export function calculateEstimatedDuration(exercises: WorkoutExercise[]): number {
  let totalMinutes = 0;
  
  exercises.forEach(exercise => {
    // Estimate 30 seconds per set + rest time
    const setTime = exercise.sets.length * 0.5; // 30 seconds per set
    const restTime = (exercise.sets.length - 1) * (exercise.restBetweenSets || 60) / 60; // rest in minutes
    totalMinutes += setTime + restTime;
  });
  
  // Add 5 minutes for warmup and transitions
  return Math.round(totalMinutes + 5);
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
  const personalRecords: PersonalRecord[] = [];
  const volumeRecords: VolumeRecord[] = [];

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
export function calculateExerciseVolume(sets: PerformedSet[]): number {
  return sets.reduce((total, set) => {
    if (!set.completed) return total;
    const reps = set.actualReps || 0;
    const weight = set.actualWeight || 0;
    return total + (reps * weight);
  }, 0);
}

/**
 * Converts exerciseProgress format to ExercisePerformance format
 * This is needed because the UI stores data in exerciseProgress format
 * but metrics calculation expects ExercisePerformance format
 */
export function convertExerciseProgressToPerformance(
  exerciseProgress: { [exerciseId: string]: any },
  template: WorkoutTemplateData
): { [exerciseId: string]: ExercisePerformance } {
  const performance: { [exerciseId: string]: ExercisePerformance } = {};

  Object.values(exerciseProgress).forEach((progress) => {
    const exercise = template.exercises.find(ex => ex.id === progress.exerciseId);
    if (!exercise) return;

    const performedSets: PerformedSet[] = progress.sets.map((setProgress: any) => ({
      setId: setProgress.setId,
      actualReps: setProgress.actualReps,
      actualWeight: setProgress.actualWeight,
      actualDuration: setProgress.actualDuration,
      actualRpe: setProgress.actualRpe,
      completed: setProgress.completed,
      skipped: setProgress.skipped || false,
      notes: setProgress.notes,
      restTime: setProgress.restTime,
    }));

    const totalVolume = performedSets.reduce((total, set) => {
      if (set.completed && set.actualReps && set.actualWeight) {
        return total + (set.actualReps * set.actualWeight);
      }
      return total;
    }, 0);

    const completedSets = performedSets.filter(set => set.completed);
    const averageRpe = completedSets.length > 0
      ? completedSets.reduce((sum, set) => sum + (set.actualRpe || 0), 0) / completedSets.length
      : undefined;

    performance[progress.exerciseId] = {
      exerciseKey: exercise.exerciseKey,
      sets: performedSets,
      exerciseNotes: progress.exerciseNotes,
      totalVolume,
      averageRpe,
    };
  });

  return performance;
}

/**
 * Detects personal records in a workout session
 */
export function detectPersonalRecords(
  exerciseKey: string,
  exerciseName: string,
  currentSets: PerformedSet[],
  historicalBests: {
    maxWeight?: number;
    maxReps?: number;
    maxVolume?: number;
  }
): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  const currentDate = new Date().toISOString();

  // Check for weight PR
  const maxWeight = Math.max(...currentSets.map(s => s.actualWeight || 0));
  if (maxWeight > 0 && (!historicalBests.maxWeight || maxWeight > historicalBests.maxWeight)) {
    records.push({
      exerciseKey,
      exerciseName,
      type: 'weight',
      value: maxWeight,
      previousBest: historicalBests.maxWeight,
      improvement: historicalBests.maxWeight ? maxWeight - historicalBests.maxWeight : maxWeight,
      date: currentDate,
    });
  }

  // Check for reps PR (at same or higher weight)
  const maxReps = Math.max(...currentSets.map(s => s.actualReps || 0));
  if (maxReps > 0 && (!historicalBests.maxReps || maxReps > historicalBests.maxReps)) {
    records.push({
      exerciseKey,
      exerciseName,
      type: 'reps',
      value: maxReps,
      previousBest: historicalBests.maxReps,
      improvement: historicalBests.maxReps ? maxReps - historicalBests.maxReps : maxReps,
      date: currentDate,
    });
  }

  // Check for volume PR
  const currentVolume = calculateExerciseVolume(currentSets);
  if (currentVolume > 0 && (!historicalBests.maxVolume || currentVolume > historicalBests.maxVolume)) {
    records.push({
      exerciseKey,
      exerciseName,
      type: 'volume',
      value: currentVolume,
      previousBest: historicalBests.maxVolume,
      improvement: historicalBests.maxVolume ? currentVolume - historicalBests.maxVolume : currentVolume,
      date: currentDate,
    });
  }

  return records;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates workout template data structure
 */
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
export function validateWorkoutSession(data: any): data is WorkoutSessionData {
  if (!data || typeof data !== 'object') return false;
  if (!data.templateSnapshot || !data.performance || !data.metrics) return false;
  
  // Validate template snapshot
  if (!validateWorkoutTemplate(data.templateSnapshot)) return false;
  
  // Validate performance data
  if (typeof data.performance !== 'object') return false;
  
  return true;
}
