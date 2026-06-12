import { UserPersonalRecords, PRUpdate, PRComparison } from '@/types/personalRecords';
import { PerformedSet, ExercisePerformance, WorkoutSessionData } from '@/types/workout';
import { db } from '@/lib/db';
import { userStats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { formatPRValue } from '@/utils/prFormatting';

export function detectPersonalRecords(
  exerciseName: string,
  performedSets: PerformedSet[],
  currentPRs: UserPersonalRecords,
  sessionId: string,
): PRUpdate[] {
  const newPRs: PRUpdate[] = [];
  const exercisePR = currentPRs[exerciseName];

  const completedSets = performedSets.filter(set => set.completed);
  if (completedSets.length === 0) return newPRs;

  const strengthSets = completedSets.filter(set => set.actualWeight && set.actualReps);
  const cardioSets = completedSets.filter(set => set.actualDuration || set.actualDistance);

  // Strength PRs
  if (strengthSets.length > 0) {
    const maxWeightSet = strengthSets.reduce((max, set) =>
      (set.actualWeight || 0) > (max.actualWeight || 0) ? set : max,
    );

    const maxWeight = maxWeightSet.actualWeight || 0;
    const repsAtMaxWeight = maxWeightSet.actualReps || 0;

    const currentMaxWeight = exercisePR?.maxWeight?.value || 0;
    if (maxWeight > currentMaxWeight) {
      newPRs.push({ exerciseName, type: 'maxWeight', value: maxWeight, reps: repsAtMaxWeight, sessionId });
    }

    const totalVolume = strengthSets.reduce((total, set) => total + ((set.actualWeight || 0) * (set.actualReps || 0)), 0);
    const avgWeight = totalVolume / strengthSets.reduce((total, set) => total + (set.actualReps || 0), 0);

    const currentMaxVolume = exercisePR?.maxVolume?.value || 0;
    if (totalVolume > currentMaxVolume) {
      newPRs.push({ exerciseName, type: 'maxVolume', value: totalVolume, sets: strengthSets.length, avgWeight, sessionId });
    }
  }

  // Cardio PRs
  if (cardioSets.length > 0) {
    const totalDuration = cardioSets.reduce((total, set) => total + (set.actualDuration || 0), 0);
    const currentMaxDuration = exercisePR?.maxDuration?.value || 0;
    if (totalDuration > currentMaxDuration) {
      newPRs.push({ exerciseName, type: 'maxDuration', value: totalDuration, sessionId });
    }

    const totalDistance = cardioSets.reduce((total, set) => total + (set.actualDistance || 0), 0);
    const currentMaxDistance = exercisePR?.maxDistance?.value || 0;
    if (totalDistance > currentMaxDistance) {
      newPRs.push({ exerciseName, type: 'maxDistance', value: totalDistance, sessionId });
    }
  }

  return newPRs;
}

export function updatePersonalRecords(currentPRs: UserPersonalRecords, newPRs: PRUpdate[]): UserPersonalRecords {
  const updatedPRs = { ...currentPRs };

  newPRs.forEach(pr => {
    if (!updatedPRs[pr.exerciseName]) updatedPRs[pr.exerciseName] = {};

    const now = new Date().toISOString();

    if (pr.type === 'maxWeight') {
      updatedPRs[pr.exerciseName].maxWeight = {
        value: pr.value,
        reps: pr.reps || 1,
        achievedAt: now,
        sessionId: pr.sessionId,
      };
    } else if (pr.type === 'maxVolume') {
      updatedPRs[pr.exerciseName].maxVolume = {
        value: pr.value,
        achievedAt: now,
        sessionId: pr.sessionId,
        sets: pr.sets || 1,
        avgWeight: pr.avgWeight || pr.value,
      };
    } else if (pr.type === 'maxDuration') {
      updatedPRs[pr.exerciseName].maxDuration = {
        value: pr.value,
        achievedAt: now,
        sessionId: pr.sessionId,
      };
    } else if (pr.type === 'maxDistance') {
      updatedPRs[pr.exerciseName].maxDistance = {
        value: pr.value,
        achievedAt: now,
        sessionId: pr.sessionId,
      };
    }
  });

  return updatedPRs;
}

export function compareToPRs(
  exerciseName: string,
  performedSets: PerformedSet[],
  currentPRs: UserPersonalRecords,
): PRComparison[] {
  const comparisons: PRComparison[] = [];
  const exercisePR = currentPRs[exerciseName];

  if (!exercisePR) return [];

  const completedSets = performedSets.filter(set => set.completed);
  if (completedSets.length === 0) return comparisons;

  const strengthSets = completedSets.filter(set => set.actualWeight && set.actualReps);
  const cardioSets = completedSets.filter(set => set.actualDuration || set.actualDistance);

  if (strengthSets.length > 0) {
    const maxWeight = Math.max(...strengthSets.map(set => set.actualWeight || 0));
    const currentMaxWeight = exercisePR.maxWeight?.value || 0;

    if (maxWeight > currentMaxWeight) {
      const improvement = maxWeight - currentMaxWeight;
      const improvementPercent = currentMaxWeight > 0 ? (improvement / currentMaxWeight) * 100 : 100;
      comparisons.push({ isNewPR: true, type: 'maxWeight', improvement, improvementPercent, previousBest: currentMaxWeight });
    }

    const totalVolume = strengthSets.reduce((total, set) => total + ((set.actualWeight || 0) * (set.actualReps || 0)), 0);
    const currentMaxVolume = exercisePR.maxVolume?.value || 0;

    if (totalVolume > currentMaxVolume) {
      const improvement = totalVolume - currentMaxVolume;
      const improvementPercent = currentMaxVolume > 0 ? (improvement / currentMaxVolume) * 100 : 100;
      comparisons.push({ isNewPR: true, type: 'maxVolume', improvement, improvementPercent, previousBest: currentMaxVolume });
    }
  }

  if (cardioSets.length > 0) {
    const totalDuration = cardioSets.reduce((total, set) => total + (set.actualDuration || 0), 0);
    const currentMaxDuration = exercisePR.maxDuration?.value || 0;

    if (totalDuration > currentMaxDuration) {
      const improvement = totalDuration - currentMaxDuration;
      const improvementPercent = currentMaxDuration > 0 ? (improvement / currentMaxDuration) * 100 : 100;
      comparisons.push({ isNewPR: true, type: 'maxDuration', improvement, improvementPercent, previousBest: currentMaxDuration });
    }

    const totalDistance = cardioSets.reduce((total, set) => total + (set.actualDistance || 0), 0);
    const currentMaxDistance = exercisePR.maxDistance?.value || 0;

    if (totalDistance > currentMaxDistance) {
      const improvement = totalDistance - currentMaxDistance;
      const improvementPercent = currentMaxDistance > 0 ? (improvement / currentMaxDistance) * 100 : 100;
      comparisons.push({ isNewPR: true, type: 'maxDistance', improvement, improvementPercent, previousBest: currentMaxDistance });
    }
  }

  return comparisons;
}

export function getTopPRs(
  personalRecords: UserPersonalRecords,
  limit: number = 10,
): Array<{
  exerciseName: string;
  type: 'maxWeight' | 'maxVolume' | 'maxDuration' | 'maxDistance';
  value: number;
  achievedAt: string;
  reps?: number;
  sets?: number;
}> {
  const allPRs: Array<{
    exerciseName: string;
    type: 'maxWeight' | 'maxVolume' | 'maxDuration' | 'maxDistance';
    value: number;
    achievedAt: string;
    reps?: number;
    sets?: number;
  }> = [];

  Object.entries(personalRecords).forEach(([exerciseName, exercisePR]) => {
    if (exercisePR.maxWeight) {
      allPRs.push({
        exerciseName, type: 'maxWeight', value: exercisePR.maxWeight.value,
        achievedAt: exercisePR.maxWeight.achievedAt, reps: exercisePR.maxWeight.reps,
      });
    }
    if (exercisePR.maxVolume) {
      allPRs.push({
        exerciseName, type: 'maxVolume', value: exercisePR.maxVolume.value,
        achievedAt: exercisePR.maxVolume.achievedAt, sets: exercisePR.maxVolume.sets,
      });
    }
    if (exercisePR.maxDuration) {
      allPRs.push({
        exerciseName, type: 'maxDuration', value: exercisePR.maxDuration.value,
        achievedAt: exercisePR.maxDuration.achievedAt,
      });
    }
    if (exercisePR.maxDistance) {
      allPRs.push({
        exerciseName, type: 'maxDistance', value: exercisePR.maxDistance.value,
        achievedAt: exercisePR.maxDistance.achievedAt,
      });
    }
  });

  return allPRs.sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime()).slice(0, limit);
}

export { formatPRValue };

export async function processSessionPRs(
  userId: string,
  sessionId: string,
  performanceData: WorkoutSessionData,
): Promise<{ newPRs: PRUpdate[]; updatedUserPRs: UserPersonalRecords }> {
  const currentPRs = await getUserPRs(userId);
  const allNewPRs: PRUpdate[] = [];

  Object.entries(performanceData.performance).forEach(([exerciseId, exercisePerformance]) => {
    const exerciseFromTemplate = performanceData.templateSnapshot.exercises.find(
      ex => ex.exerciseKey === exercisePerformance.exerciseKey,
    );
    const exerciseName = exerciseFromTemplate?.name || exercisePerformance.exerciseKey || exerciseId;
    const newPRs = detectPersonalRecords(exerciseName, exercisePerformance.sets, currentPRs, sessionId);
    allNewPRs.push(...newPRs);
  });

  const updatedPRs = updatePersonalRecords(currentPRs, allNewPRs);

  await db
    .insert(userStats)
    .values({ userId, personalRecords: updatedPRs })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: { personalRecords: updatedPRs },
    });

  return { newPRs: allNewPRs, updatedUserPRs: updatedPRs };
}

export async function getUserPRs(userId: string): Promise<UserPersonalRecords> {
  const [stats] = await db
    .select({ personalRecords: userStats.personalRecords })
    .from(userStats)
    .where(eq(userStats.userId, userId));

  return (stats?.personalRecords as UserPersonalRecords) || {};
}

export function detectSessionPRs(
  performanceData: { [exerciseId: string]: ExercisePerformance },
  templateData: WorkoutSessionData['templateSnapshot'],
  currentPRs: UserPersonalRecords,
  sessionId: string,
): PRUpdate[] {
  const allNewPRs: PRUpdate[] = [];

  Object.entries(performanceData).forEach(([exerciseId, exercisePerformance]) => {
    const exerciseFromTemplate = templateData.exercises.find(ex => ex.exerciseKey === exercisePerformance.exerciseKey);
    const exerciseName = exerciseFromTemplate?.name || exercisePerformance.exerciseKey || exerciseId;
    const newPRs = detectPersonalRecords(exerciseName, exercisePerformance.sets, currentPRs, sessionId);
    allNewPRs.push(...newPRs);
  });

  return allNewPRs;
}

export async function processWorkoutSessionPRs(
  userId: string,
  sessionId: string,
  performanceData: { [exerciseId: string]: ExercisePerformance },
  templateData: WorkoutSessionData['templateSnapshot'],
): Promise<{ newPRs: PRUpdate[]; updatedUserPRs: UserPersonalRecords }> {
  const currentPRs = await getUserPRs(userId);
  const newPRs = detectSessionPRs(performanceData, templateData, currentPRs, sessionId);
  const updatedPRs = updatePersonalRecords(currentPRs, newPRs);

  await db
    .insert(userStats)
    .values({ userId, personalRecords: updatedPRs })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: { personalRecords: updatedPRs },
    });

  return { newPRs, updatedUserPRs: updatedPRs };
}
