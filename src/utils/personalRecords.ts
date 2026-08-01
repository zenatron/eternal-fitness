import { UserPersonalRecords, PRUpdate, PRType } from '@/types/personalRecords';
import { PerformedSet, ExercisePerformance, WorkoutSessionData } from '@/types/workout';
import { db } from '@/lib/db';
import { userStats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { formatPRValue } from '@/utils/prFormatting';
import { bestOneRepMax } from '@/utils/oneRepMax';
import { volumeMultiplier } from '@/lib/volume';

export function detectPersonalRecords(
  exerciseName: string,
  performedSets: PerformedSet[],
  currentPRs: UserPersonalRecords,
  sessionId: string,
  perSide?: boolean,
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

    // Apply the per-side (dumbbell/unilateral) multiplier so volume PRs match
    // the session volume the user sees elsewhere (lib/volume).
    const rawVolume = strengthSets.reduce((total, set) => total + ((set.actualWeight || 0) * (set.actualReps || 0)), 0);
    const totalReps = strengthSets.reduce((total, set) => total + (set.actualReps || 0), 0);
    const totalVolume = rawVolume * volumeMultiplier(perSide);
    const avgWeight = totalReps > 0 ? rawVolume / totalReps : 0;

    const currentMaxVolume = exercisePR?.maxVolume?.value || 0;
    if (totalVolume > currentMaxVolume) {
      newPRs.push({ exerciseName, type: 'maxVolume', value: totalVolume, sets: strengthSets.length, avgWeight, sessionId });
    }

    /*
     * Estimated 1RM. Independent of the maxWeight record above: a set can beat
     * your best estimate without touching your heaviest single, which is
     * exactly the progress a max-weight-only log misses.
     *
     * bestOneRepMax returns null for high-rep work, where the formulas stop
     * being predictive - no record is claimed in that case rather than a
     * flattering one.
     */
    const best = bestOneRepMax(strengthSets);
    const currentMaxE1RM = exercisePR?.maxOneRepMax?.value || 0;
    if (best && best.oneRepMax > currentMaxE1RM) {
      newPRs.push({
        exerciseName,
        type: 'maxOneRepMax',
        value: best.oneRepMax,
        weight: best.weight,
        reps: best.reps,
        sessionId,
      });
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

    if (pr.type === 'maxOneRepMax') {
      updatedPRs[pr.exerciseName].maxOneRepMax = {
        value: pr.value,
        weight: pr.weight ?? pr.value,
        reps: pr.reps ?? 1,
        achievedAt: now,
        sessionId: pr.sessionId,
      };
    } else if (pr.type === 'maxWeight') {
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

export interface TopPR {
  exerciseName: string;
  type: PRType;
  value: number;
  achievedAt: string;
  reps?: number;
  sets?: number;
  weight?: number;
}

export function getTopPRs(
  personalRecords: UserPersonalRecords,
  limit: number = 10,
): Array<TopPR> {
  const allPRs: TopPR[] = [];

  Object.entries(personalRecords).forEach(([exerciseName, exercisePR]) => {
    if (exercisePR.maxOneRepMax) {
      allPRs.push({
        exerciseName, type: 'maxOneRepMax', value: exercisePR.maxOneRepMax.value,
        achievedAt: exercisePR.maxOneRepMax.achievedAt, reps: exercisePR.maxOneRepMax.reps,
        weight: exercisePR.maxOneRepMax.weight,
      });
    }
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
    const newPRs = detectPersonalRecords(exerciseName, exercisePerformance.sets, currentPRs, sessionId, exerciseFromTemplate?.perSide);
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
