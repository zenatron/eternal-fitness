// 🚀 WORKOUT DISPLAY UTILITIES
// Helper functions for displaying JSON-based workout data in the UI

import { 
  WorkoutTemplate, 
  WorkoutTemplateData, 
  WorkoutExercise, 
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
 * Formats template sets for display components
 */
export function formatTemplateSets(template: WorkoutTemplate): Array<{
  id: string;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  calories?: number;
  exercise: {
    id: string;
    name: string;
    muscles: string[];
    equipment: string[];
  };
}> {
  const sets: any[] = [];
  
  if (template.workoutData?.exercises) {
    template.workoutData.exercises.forEach((exercise, exerciseIndex) => {
      exercise.sets.forEach((set, setIndex) => {
        sets.push({
          id: `${exercise.id}-${set.id}`,
          reps: typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.min || 0,
          weight: set.targetWeight || 0,
          duration: set.targetDuration,
          distance: set.targetDistance,
          calories: set.targetCalories,
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

  return sets;
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
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'intermediate':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'advanced':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700/30';
  }
}

/**
 * Gets workout type color class
 */
export function getWorkoutTypeColor(workoutType: string): string {
  switch (workoutType.toLowerCase()) {
    case 'strength':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
    case 'cardio':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    case 'hybrid':
      return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30';
    case 'flexibility':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'sports':
      return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700/30';
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
  if (rpe <= 3) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
  if (rpe <= 5) return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
  if (rpe <= 7) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
  if (rpe <= 8) return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
  return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
}
