import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkoutTemplate, WorkoutType, Difficulty } from '@/types/workout';

// 🚀 NEW JSON-BASED TEMPLATE INPUT DATA
export interface TemplateInputData {
  name: string;
  description?: string;
  favorite?: boolean;
  workoutType?: WorkoutType;
  difficulty?: Difficulty;
  tags?: string[];
  exercises: {
    exerciseKey: string;
    sets: {
      reps: number;
      weight?: number;
      duration?: number;
      distance?: number;
      type?: string;
      restTime?: number;
      notes?: string;
    }[];
    instructions?: string;
    restBetweenSets?: number;
  }[];
}

export interface UpdateTemplateArgs {
  id: string;
  data: TemplateInputData;
}

// Define the context type returned by onMutate
interface ToggleFavoriteContext {
  previousTemplates: WorkoutTemplate[] | undefined;
  previousTemplate: WorkoutTemplate | undefined;
}

/**
 * Hook for toggling favorite status of a template using dedicated API endpoint
 */
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  // Update mutation signature: Input is string (templateId), context is ToggleFavoriteContext
  return useMutation<WorkoutTemplate, Error, string, ToggleFavoriteContext>({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`/api/template/${templateId}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Content-Type might not be strictly necessary for POST with no body, but good practice
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({
            error: `Failed to toggle favorite (status ${response.status})`,
          }));
        console.error(
          `useToggleFavorite: Failed POST request for ${templateId}/favorite:`,
          errorData,
        );
        throw new Error(errorData?.error?.message || errorData?.error || 'Failed to toggle favorite status');
      }

      return response.json();
    },

    // onMutate uses templateId (string) as input now
    onMutate: async (
      templateId: string,
    ): Promise<ToggleFavoriteContext> => {
      await queryClient.cancelQueries({ queryKey: ['json-templates'] });
      await queryClient.cancelQueries({ queryKey: ['json-template', templateId] });

      const previousTemplates = queryClient.getQueryData<WorkoutTemplate[]>([
        'json-templates',
      ]);
      const previousTemplate = queryClient.getQueryData<WorkoutTemplate>([
        'json-template',
        templateId,
      ]);

      const newFavoriteStatusOptimistic = !previousTemplate?.favorite;

      // Update the cache for the list view
      if (previousTemplates) {
        queryClient.setQueryData(
          ['json-templates'],
          previousTemplates.map((t) =>
            t.id === templateId
              ? { ...t, favorite: newFavoriteStatusOptimistic }
              : t,
          ),
        );
      }
      // Update the cache for the single template view (if it exists)
      if (previousTemplate) {
        queryClient.setQueryData(['json-template', templateId], {
          ...previousTemplate,
          favorite: newFavoriteStatusOptimistic,
        });
      }
      return { previousTemplates, previousTemplate };
    },

    // onError uses templateId (string) as variable now
    onError: (err, templateId, context: ToggleFavoriteContext | undefined) => {
      console.error(
        `useToggleFavorite: onError for ${templateId}, rolling back optimistic update. Error:`,
        err,
      );
      if (context?.previousTemplates) {
        queryClient.setQueryData(['json-templates'], context.previousTemplates);
      }
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          ['json-template', templateId],
          context.previousTemplate,
        );
      }
    },

    onSettled: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ['json-templates'] });
      queryClient.invalidateQueries({ queryKey: ['json-template', templateId] });
    },
  });
};

/**
 * Hook for deleting a template
 */
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`/api/template/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(
            errorData?.error ||
              `Failed to delete template (status ${response.status})`,
          );
        } catch (e) {
          throw new Error(
            `Failed to delete template: ${response.status} ${response.statusText}. ${errorText}`,
          );
        }
      }
      return templateId;
    },

    onSuccess: (deletedTemplateId) => {
      queryClient.invalidateQueries({ queryKey: ['json-templates'] });
      queryClient.removeQueries({ queryKey: ['json-template', deletedTemplateId] });
    },
  });
};

/**
 * Hook for creating a new template
 */
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation<WorkoutTemplate, Error, TemplateInputData>({
    mutationFn: async (templateData) => {
      const response = await fetch('/api/template/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to create template' }));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to create template');
      }
      const result = await response.json();
      return result.data;
    },
    onSuccess: (newTemplate) => {
      // Invalidate the list of templates to refetch
      queryClient.invalidateQueries({ queryKey: ['json-templates'] });
      // Optionally, add the new template to the cache immediately
      queryClient.setQueryData(['json-template', newTemplate.id], newTemplate);
    },
    // onError: (error) => { // Basic error logging
    //   console.error("Error creating template:", error);
    // }
  });
};

/**
 * Hook for updating an existing template
 */
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation<WorkoutTemplate, Error, UpdateTemplateArgs>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/template/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to update template' }));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to update template');
      }
      const result = await response.json();
      return result.data;
    },
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['json-templates'] });
      queryClient.invalidateQueries({
        queryKey: ['json-template', updatedTemplate.id],
      });
      queryClient.setQueryData(
        ['json-template', updatedTemplate.id],
        updatedTemplate,
      );
    },
    // onError: (error, variables) => { // Basic error logging
    //   console.error(`Error updating template ${variables.id}:`, error);
    // }
  });
};

/**
 * Hook for updating user profile
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData: Record<string, unknown>) => {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || errorData?.error || 'Failed to update profile');
      }

      return response.json();
    },

    onSuccess: async (data) => {
      // Invalidate and refetch the profile data
      await queryClient.invalidateQueries({ queryKey: ['profile'] });

      // Set the new profile data in the cache immediately
      if (data?.data) {
        queryClient.setQueryData(['profile'], data.data);
      }
    },
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
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || errorData?.error || 'Failed to deduplicate exercises');
      }

      return response.json();
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['json-templates'] });
      queryClient.invalidateQueries({ queryKey: ['json-template'] });
    },
  });
};

// ============================================================================
// SESSION MUTATIONS
// ============================================================================

export interface UpdateSessionData {
  duration?: number;
  notes?: string;
  completedAt?: string;
  performance?: Record<string, {
    exerciseKey: string;
    sets: Array<{
      setId: string;
      actualReps?: number;
      actualWeight?: number;
      actualDuration?: number;
      actualRpe?: number;
      completed: boolean;
      skipped?: boolean;
      notes?: string;
      restTime?: number;
    }>;
    exerciseNotes?: string;
    totalVolume: number;
    averageRpe?: number;
  }>;
}

export const useUpdateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSessionData }) => {
      const response = await fetch(`/api/session/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update session' }));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to update session');
      }
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });
};

export interface LogPastWorkoutData {
  templateId?: string;
  completedAt: string;
  duration: number;
  notes?: string;
  performance?: UpdateSessionData['performance'];
  adHocName?: string;
  adHocWorkoutType?: string;
  adHocExercises?: Array<{
    exerciseKey: string;
    sets: Array<{
      reps: number;
      weight?: number;
      duration?: number;
      distance?: number;
      type?: string;
      restTime?: number;
    }>;
  }>;
}

export const useLogPastWorkout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LogPastWorkoutData) => {
      const response = await fetch('/api/session/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to log workout' }));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to log workout');
      }
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['json-templates'] });
    },
  });
};
