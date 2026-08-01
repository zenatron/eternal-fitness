import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { ExerciseHistoryPoint } from '@/app/api/exercise/[exerciseId]/history/route';
import type { ExercisePR } from '@/types/personalRecords';

export interface ExerciseHistoryResponse {
  exerciseKey: string;
  name: string;
  muscles: string[];
  equipment: string[];
  exerciseType: 'strength' | 'cardio' | 'flexibility';
  personalRecords: ExercisePR;
  history: ExerciseHistoryPoint[];
  truncated: boolean;
}

/**
 * History and records for a single exercise.
 *
 * Cached for a while: this is derived from completed sessions, which only
 * change when a workout is finished or edited, and the underlying scan is the
 * most expensive read in the app.
 */
export function useExerciseHistory(exerciseKey: string | undefined) {
  return useQuery<ExerciseHistoryResponse>({
    queryKey: [...queryKeys.exerciseHistory, exerciseKey],
    enabled: Boolean(exerciseKey),
    queryFn: async () => {
      const res = await fetch(`/api/exercise/${encodeURIComponent(exerciseKey!)}/history`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to load exercise history');
      }
      return (await res.json()).data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
