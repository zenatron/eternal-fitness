import { UserPersonalRecords, PRUpdate, PRComparison } from '@/types/personalRecords';
import { PerformedSet, ExercisePerformance, WorkoutSessionData } from '@/types/workout';
import prisma from '@/lib/prisma';

/**
 * Check if a workout performance contains any new personal records
 */
export function detectPersonalRecords(
  exerciseName: string,
  performedSets: PerformedSet[],
  currentPRs: UserPersonalRecords,
  sessionId: string
): PRUpdate[] {
  const newPRs: PRUpdate[] = [];
  const exercisePR = currentPRs[exerciseName];

  // Calculate max weight achieved
  const completedSets = performedSets.filter(set => set.completed && set.actualWeight && set.actualReps);
  if (completedSets.length === 0) return newPRs;
  
  const maxWeightSet = completedSets.reduce((max, set) => 
    (set.actualWeight || 0) > (max.actualWeight || 0) ? set : max
  );
  
  const maxWeight = maxWeightSet.actualWeight || 0;
  const repsAtMaxWeight = maxWeightSet.actualReps || 0;
  
  // Check for max weight PR
  const currentMaxWeight = exercisePR?.maxWeight?.value || 0;
  if (maxWeight > currentMaxWeight) {
    newPRs.push({
      exerciseName,
      type: 'maxWeight',
      value: maxWeight,
      reps: repsAtMaxWeight,
      sessionId
    });
  }

  // Calculate total volume for this exercise
  const totalVolume = completedSets.reduce((total, set) => {
    return total + ((set.actualWeight || 0) * (set.actualReps || 0));
  }, 0);

  const avgWeight = totalVolume / completedSets.reduce((total, set) => total + (set.actualReps || 0), 0);

  // Check for max volume PR
  const currentMaxVolume = exercisePR?.maxVolume?.value || 0;
  if (totalVolume > currentMaxVolume) {
    newPRs.push({
      exerciseName,
      type: 'maxVolume',
      value: totalVolume,
      sets: completedSets.length,
      avgWeight: avgWeight,
      sessionId
    });
  }

  return newPRs;
}

/**
 * Update user's personal records with new PRs
 */
export function updatePersonalRecords(
  currentPRs: UserPersonalRecords,
  newPRs: PRUpdate[]
): UserPersonalRecords {
  const updatedPRs = { ...currentPRs };
  
  newPRs.forEach(pr => {
    if (!updatedPRs[pr.exerciseName]) {
      updatedPRs[pr.exerciseName] = {};
    }
    
    const now = new Date().toISOString();
    
    if (pr.type === 'maxWeight') {
      updatedPRs[pr.exerciseName].maxWeight = {
        value: pr.value,
        reps: pr.reps || 1,
        achievedAt: now,
        sessionId: pr.sessionId
      };
    } else if (pr.type === 'maxVolume') {
      updatedPRs[pr.exerciseName].maxVolume = {
        value: pr.value,
        achievedAt: now,
        sessionId: pr.sessionId,
        sets: pr.sets || 1,
        avgWeight: pr.avgWeight || pr.value
      };
    }
  });
  
  return updatedPRs;
}

/**
 * Compare current performance with existing PRs
 */
export function compareToPRs(
  exerciseName: string,
  performedSets: PerformedSet[],
  currentPRs: UserPersonalRecords
): PRComparison[] {
  const comparisons: PRComparison[] = [];
  const exercisePR = currentPRs[exerciseName];
  
  if (!exercisePR) {
    return []; // No existing PRs to compare against
  }
  
  const completedSets = performedSets.filter(set => set.completed && set.actualWeight && set.actualReps);
  if (completedSets.length === 0) return comparisons;
  
  // Check max weight
  const maxWeight = Math.max(...completedSets.map(set => set.actualWeight || 0));
  const currentMaxWeight = exercisePR.maxWeight?.value || 0;
  
  if (maxWeight > currentMaxWeight) {
    const improvement = maxWeight - currentMaxWeight;
    const improvementPercent = currentMaxWeight > 0 ? (improvement / currentMaxWeight) * 100 : 100;
    
    comparisons.push({
      isNewPR: true,
      type: 'maxWeight',
      improvement,
      improvementPercent,
      previousBest: currentMaxWeight
    });
  }
  
  // Check max volume
  const totalVolume = completedSets.reduce((total, set) => {
    return total + ((set.actualWeight || 0) * (set.actualReps || 0));
  }, 0);
  
  const currentMaxVolume = exercisePR.maxVolume?.value || 0;
  
  if (totalVolume > currentMaxVolume) {
    const improvement = totalVolume - currentMaxVolume;
    const improvementPercent = currentMaxVolume > 0 ? (improvement / currentMaxVolume) * 100 : 100;
    
    comparisons.push({
      isNewPR: true,
      type: 'maxVolume',
      improvement,
      improvementPercent,
      previousBest: currentMaxVolume
    });
  }
  
  return comparisons;
}

/**
 * Get top PRs for display (sorted by most recent)
 */
export function getTopPRs(
  personalRecords: UserPersonalRecords,
  limit: number = 10
): Array<{
  exerciseName: string;
  type: 'maxWeight' | 'maxVolume';
  value: number;
  achievedAt: string;
  reps?: number;
  sets?: number;
}> {
  const allPRs: Array<{
    exerciseName: string;
    type: 'maxWeight' | 'maxVolume';
    value: number;
    achievedAt: string;
    reps?: number;
    sets?: number;
  }> = [];
  
  Object.entries(personalRecords).forEach(([exerciseName, exercisePR]) => {
    if (exercisePR.maxWeight) {
      allPRs.push({
        exerciseName,
        type: 'maxWeight',
        value: exercisePR.maxWeight.value,
        achievedAt: exercisePR.maxWeight.achievedAt,
        reps: exercisePR.maxWeight.reps
      });
    }
    
    if (exercisePR.maxVolume) {
      allPRs.push({
        exerciseName,
        type: 'maxVolume',
        value: exercisePR.maxVolume.value,
        achievedAt: exercisePR.maxVolume.achievedAt,
        sets: exercisePR.maxVolume.sets
      });
    }
  });
  
  // Sort by most recent and return top results
  return allPRs
    .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime())
    .slice(0, limit);
}

/**
 * Format PR value for display
 */
export function formatPRValue(
  value: number,
  type: 'maxWeight' | 'maxVolume',
  useMetric: boolean = false
): string {
  const unit = useMetric ? 'kg' : 'lbs';

  if (type === 'maxWeight') {
    return `${value.toFixed(1)} ${unit}`;
  } else {
    return `${value.toFixed(0)} ${unit}`;
  }
}

/**
 * Process a completed workout session to detect and update personal records
 */
export async function processSessionPRs(
  userId: string,
  sessionId: string,
  performanceData: WorkoutSessionData
): Promise<{
  newPRs: PRUpdate[];
  updatedUserPRs: UserPersonalRecords;
}> {
  // Get current user PRs
  const currentPRs = await getUserPRs(userId);
  const allNewPRs: PRUpdate[] = [];

  // Process each exercise in the session
  Object.entries(performanceData.performance).forEach(([exerciseId, exercisePerformance]) => {
    // Get exercise name from template snapshot
    const exerciseFromTemplate = performanceData.templateSnapshot.exercises.find(
      ex => ex.exerciseKey === exercisePerformance.exerciseKey
    );
    const exerciseName = exerciseFromTemplate?.name || exercisePerformance.exerciseKey || exerciseId;

    const newPRs = detectPersonalRecords(
      exerciseName,
      exercisePerformance.sets,
      currentPRs,
      sessionId
    );
    allNewPRs.push(...newPRs);
  });

  // Update user's personal records
  const updatedPRs = updatePersonalRecords(currentPRs, allNewPRs);

  // Save updated PRs to UserStats using Prisma upsert
  await prisma.userStats.upsert({
    where: { userId },
    update: {
      personalRecords: updatedPRs as any // Type assertion for JSON field
    },
    create: {
      userId,
      personalRecords: updatedPRs as any // Type assertion for JSON field
    }
  });

  return {
    newPRs: allNewPRs,
    updatedUserPRs: updatedPRs
  };
}

/**
 * Get user's current personal records from database
 */
export async function getUserPRs(userId: string): Promise<UserPersonalRecords> {
  const userStats = await prisma.userStats.findUnique({
    where: { userId },
    select: { personalRecords: true }
  });

  return (userStats?.personalRecords as UserPersonalRecords) || {};
}

/**
 * Process performance data from a workout session to detect PRs
 * This is used during session completion when you have the template data
 */
export function detectSessionPRs(
  performanceData: { [exerciseId: string]: ExercisePerformance },
  templateData: WorkoutSessionData['templateSnapshot'],
  currentPRs: UserPersonalRecords,
  sessionId: string
): PRUpdate[] {
  const allNewPRs: PRUpdate[] = [];

  Object.entries(performanceData).forEach(([exerciseId, exercisePerformance]) => {
    // Get exercise name from template
    const exerciseFromTemplate = templateData.exercises.find(
      ex => ex.exerciseKey === exercisePerformance.exerciseKey
    );
    const exerciseName = exerciseFromTemplate?.name || exercisePerformance.exerciseKey || exerciseId;

    const newPRs = detectPersonalRecords(
      exerciseName,
      exercisePerformance.sets,
      currentPRs,
      sessionId
    );
    allNewPRs.push(...newPRs);
  });

  return allNewPRs;
}

/**
 * Complete PR processing workflow for a session
 * This is the main function to call when completing a workout
 */
export async function processWorkoutSessionPRs(
  userId: string,
  sessionId: string,
  performanceData: { [exerciseId: string]: ExercisePerformance },
  templateData: WorkoutSessionData['templateSnapshot']
): Promise<{
  newPRs: PRUpdate[];
  updatedUserPRs: UserPersonalRecords;
}> {
  // Get current user PRs
  const currentPRs = await getUserPRs(userId);

  // Detect new PRs
  const newPRs = detectSessionPRs(performanceData, templateData, currentPRs, sessionId);

  // Update user's personal records
  const updatedPRs = updatePersonalRecords(currentPRs, newPRs);

  // Save updated PRs to UserStats
  await prisma.userStats.upsert({
    where: { userId },
    update: {
      personalRecords: updatedPRs as any // Type assertion for JSON field
    },
    create: {
      userId,
      personalRecords: updatedPRs as any // Type assertion for JSON field
    }
  });

  return {
    newPRs,
    updatedUserPRs: updatedPRs
  };
}
