import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Workout } from '@/types/workout';

/**
 * Hook for toggling favorite status of a workout
 */
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workoutId: string) => {
      const response = await fetch(`/api/workout/${workoutId}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to toggle favorite status');
      }
      
      return response.json();
    },
    
    // When mutate is called:
    onMutate: async (workoutId) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['workouts'] });
      await queryClient.cancelQueries({ queryKey: ['workout', workoutId] });
      
      // Snapshot the previous values
      const previousWorkouts = queryClient.getQueryData<Workout[]>(['workouts']);
      const previousWorkout = queryClient.getQueryData<Workout>(['workout', workoutId]);
      
      // Optimistically update the workouts list
      if (previousWorkouts) {
        queryClient.setQueryData(['workouts'], 
          previousWorkouts.map(w => 
            w.id === workoutId ? {...w, favorite: !w.favorite} : w
          )
        );
      }
      
      // Optimistically update the single workout
      if (previousWorkout) {
        queryClient.setQueryData(['workout', workoutId], 
          {...previousWorkout, favorite: !previousWorkout.favorite}
        );
      }
      
      // Return the snapshots so we can restore if something goes wrong
      return { previousWorkouts, previousWorkout };
    },
    
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, workoutId, context) => {
      if (context?.previousWorkouts) {
        queryClient.setQueryData(['workouts'], context.previousWorkouts);
      }
      
      if (context?.previousWorkout) {
        queryClient.setQueryData(['workout', workoutId], context.previousWorkout);
      }
    },
    
    // Always refetch after error or success to ensure our local data is correct
    onSettled: (data, error, workoutId) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
};

/**
 * Hook for deleting a workout
 */
export const useDeleteWorkout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workoutId: string) => {
      const response = await fetch(`/api/workout/${workoutId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete workout');
      }
      
      return workoutId;
    },
    
    onSuccess: () => {
      // Invalidate and refetch workouts list
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    }
  });
};

/**
 * Hook for creating a new workout
 */
export const useCreateWorkout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workoutData: any) => {
      const response = await fetch('/api/workout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workoutData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to create workout');
      }
      
      return response.json();
    },
    
    onSuccess: () => {
      // Invalidate and refetch workouts list
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    }
  });
};

/**
 * Hook for updating an existing workout
 */
export const useUpdateWorkout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ workoutId, workoutData }: { workoutId: string, workoutData: any }) => {
      const response = await fetch(`/api/workout/${workoutId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workoutData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update workout');
      }
      
      return response.json();
    },
    
    onSuccess: (data, variables) => {
      // Invalidate and refetch specific workout and workouts list
      queryClient.invalidateQueries({ queryKey: ['workout', variables.workoutId] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    }
  });
};

/**
 * Hook for updating user profile
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profileData: any) => {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update profile');
      }
      
      return response.json();
    },
    
    onSuccess: () => {
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });
};

/**
 * Hook for deduplicating exercises in the database
 */
export const useDeduplicateExercises = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/exercises/deduplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to deduplicate exercises');
      }
      
      return response.json();
    },
    
    onSuccess: () => {
      // Invalidate any relevant queries that might include exercise data
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
    }
  });
}; 