// 🚀 WORKOUT DISPLAY UTILITIES
// Helper functions for displaying JSON-based workout data in the UI

import {
  WorkoutTemplate,
  WorkoutSet,
  WorkoutSession,
  WorkoutSessionData,
  ExercisePerformance,
  PerformedSet
} from '@/types/workout';

// ============================================================================
// TEMPLATE DISPLAY UTILITIES
// ============================================================================

/**
 * Extracts exercise data from JSON template for display
 */
export function getTemplateExercises(template: WorkoutTemplate): Array<{
  id: string;
  exerciseKey: string;
  name: string;
  muscles: string[];
  equipment: string[];
  sets: WorkoutSet[];
  instructions?: string;
}> {
  if (!template.workoutData?.exercises) return [];
  
  return template.workoutData.exercises.map(exercise => ({
    id: exercise.id,
    exerciseKey: exercise.exerciseKey,
    name: exercise.name,
    muscles: exercise.muscles,
    equipment: exercise.equipment,
    sets: exercise.sets,
    instructions: exercise.instructions,
  }));
}

/**
 * Counts unique exercises in a template
 */
export function countUniqueExercises(template: WorkoutTemplate): number {
  return template.workoutData?.exercises?.length || 0;
}

/**
 * Gets total sets count for a template
 */
export function getTotalSetsCount(template: WorkoutTemplate): number {
  if (!template.workoutData?.exercises) return 0;
  
  return template.workoutData.exercises.reduce((total, exercise) => {
    return total + exercise.sets.length;
  }, 0);
}

/**
 * Gets muscle groups targeted by a template
 */
export function getTemplateMuscleGroups(template: WorkoutTemplate): string[] {
  return template.workoutData?.metadata?.targetMuscleGroups || [];
}

/**
 * Gets equipment needed for a template
 */
export function getTemplateEquipment(template: WorkoutTemplate): string[] {
  return template.workoutData?.metadata?.equipment || [];
}

/**
 * Formats template for backward compatibility with existing components
 */
export function formatTemplateForLegacyComponents(template: WorkoutTemplate): {
  id: string;
  name: string;
  favorite: boolean;
  totalVolume: number;
  createdAt: Date;
  updatedAt: Date;
  sets: Array<{
    id: string;
    reps: number;
    weight: number;
    exercise: {
      id: string;
      name: string;
      muscles: string[];
      equipment: string[];
    };
  }>;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sets: any[] = [];

  if (template.workoutData?.exercises) {
    template.workoutData.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        sets.push({
          id: `${exercise.id}-${set.id}`,
          reps: typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.min || 0,
          weight: set.targetWeight || 0,
          exercise: {
            id: exercise.exerciseKey,
            name: exercise.name,
            muscles: exercise.muscles,
            equipment: exercise.equipment,
          },
        });
      });
    });
  }

  return {
    id: template.id,
    name: template.name,
    favorite: template.favorite,
    totalVolume: template.totalVolume,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    sets,
  };
}

// ============================================================================
// SESSION DISPLAY UTILITIES
// ============================================================================

/**
 * Gets session performance summary
 */
export function getSessionSummary(session: WorkoutSession): {
  totalVolume: number;
  totalSets: number;
  completedSets: number;
  skippedSets: number;
  averageRpe?: number;
  personalRecords: number;
  adherenceScore: number;
} {
  const performanceData = session.performanceData as WorkoutSessionData;
  
  return {
    totalVolume: session.totalVolume,
    totalSets: session.totalSets,
    completedSets: performanceData.metrics.completedSets,
    skippedSets: performanceData.metrics.skippedSets,
    averageRpe: performanceData.metrics.averageRpe,
    personalRecords: session.personalRecords,
    adherenceScore: performanceData.metrics.adherenceScore,
  };
}

/**
 * Gets exercise performance from session
 */
export function getSessionExercisePerformance(
  session: WorkoutSession,
  exerciseId: string
): ExercisePerformance | null {
  const performanceData = session.performanceData as WorkoutSessionData;
  return performanceData.performance[exerciseId] || null;
}

/**
 * Gets all exercises performed in a session
 */
export function getSessionExercises(session: WorkoutSession): Array<{
  exerciseId: string;
  exerciseKey: string;
  name: string;
  performance: ExercisePerformance;
}> {
  const performanceData = session.performanceData as WorkoutSessionData;
  
  return Object.entries(performanceData.performance).map(([exerciseId, performance]) => ({
    exerciseId,
    exerciseKey: performance.exerciseKey,
    name: performanceData.templateSnapshot.exercises.find(ex => ex.id === exerciseId)?.name || 'Unknown Exercise',
    performance,
  }));
}

/**
 * Calculates set performance percentage
 */
export function calculateSetPerformance(
  targetReps: number | { min: number; max: number },
  actualReps: number
): number {
  if (typeof targetReps === 'number') {
    return actualReps >= targetReps ? 100 : (actualReps / targetReps) * 100;
  } else {
    if (actualReps >= targetReps.max) return 100;
    if (actualReps >= targetReps.min) return 75;
    return (actualReps / targetReps.min) * 75;
  }
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Formats set display text
 */
export function formatSetDisplay(set: WorkoutSet, useMetric: boolean = false): string {
  const reps = typeof set.targetReps === 'number'
    ? set.targetReps.toString()
    : `${set.targetReps?.min}-${set.targetReps?.max}`;

  const unit = useMetric ? 'kg' : 'lbs';
  const weight = set.targetWeight ? ` × ${set.targetWeight}${unit}` : '';
  const duration = set.targetDuration ? ` (${set.targetDuration}s)` : '';

  return `${reps}${weight}${duration}`;
}

/**
 * Formats performed set display text
 */
export function formatPerformedSetDisplay(set: PerformedSet, useMetric: boolean = false): string {
  const reps = set.actualReps ? set.actualReps.toString() : '0';
  const unit = useMetric ? 'kg' : 'lbs';
  const weight = set.actualWeight ? ` × ${set.actualWeight}${unit}` : '';
  const duration = set.actualDuration ? ` (${set.actualDuration}s)` : '';
  const rpe = set.actualRpe ? ` @${set.actualRpe}` : '';

  return `${reps}${weight}${duration}${rpe}`;
}

/**
 * Gets difficulty color class
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'text-success-600 bg-success-100 dark:text-success-400 dark:bg-success-900/30';
    case 'intermediate':
      return 'text-award-600 bg-award-100 dark:text-award-400 dark:bg-award-900/30';
    case 'advanced':
      return 'text-danger-600 bg-danger-100 dark:text-danger-400 dark:bg-danger-900/30';
    default:
      return 'text-surface-700 bg-surface-200 dark:text-surface-800 dark:bg-surface-300/40';
  }
}

/**
 * Gets workout type color class.
 *
 * Kept within the forge/surface palette rather than the blue/purple/green
 * assortment this used before, which clashed badly with the amber accents these
 * badges sit next to on template cards. Types are distinguished by weight and
 * warmth instead of by unrelated hues, and `ember` stays reserved for
 * destructive actions so it is not used here.
 */
export function getWorkoutTypeColor(workoutType: string): string {
  switch (workoutType.toLowerCase()) {
    case 'strength':
      return 'text-accent-700 bg-accent-100 dark:text-accent-300 dark:bg-accent-900/40';
    case 'cardio':
      return 'text-warning-700 bg-warning-100 dark:text-warning-300 dark:bg-warning-900/30';
    case 'hybrid':
      return 'text-award-700 bg-award-100 dark:text-award-300 dark:bg-award-900/30';
    case 'flexibility':
      return 'text-info-700 bg-info-100 dark:text-info-300 dark:bg-info-900/30';
    case 'sports':
      return 'text-success-700 bg-success-100 dark:text-success-300 dark:bg-success-900/30';
    default:
      return 'text-surface-700 bg-surface-200 dark:text-surface-800 dark:bg-surface-300/40';
  }
}

/**
 * Formats RPE display
 */
export function formatRPE(rpe: number): string {
  if (rpe <= 3) return `${rpe} (Very Easy)`;
  if (rpe <= 5) return `${rpe} (Easy)`;
  if (rpe <= 7) return `${rpe} (Moderate)`;
  if (rpe <= 8) return `${rpe} (Hard)`;
  if (rpe <= 9) return `${rpe} (Very Hard)`;
  return `${rpe} (Maximum)`;
}

/**
 * Gets RPE color class
 */
export function getRPEColor(rpe: number): string {
  if (rpe <= 3) return 'text-success-600 bg-success-100 dark:text-success-400 dark:bg-success-900/30';
  if (rpe <= 5) return 'text-info-600 bg-info-100 dark:text-info-400 dark:bg-info-900/30';
  if (rpe <= 7) return 'text-award-600 bg-award-100 dark:text-award-400 dark:bg-award-900/30';
  if (rpe <= 8) return 'text-warning-600 bg-warning-100 dark:text-warning-400 dark:bg-warning-900/30';
  return 'text-danger-600 bg-danger-100 dark:text-danger-400 dark:bg-danger-900/30';
}
