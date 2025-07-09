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
      // Call the dedicated favorite toggle endpoint
      console.log(
        `useToggleFavorite: Calling POST /api/template/${templateId}/favorite`,
      );
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

      console.log(
        `useToggleFavorite: Successfully called POST for ${templateId}/favorite`,
      );
      return response.json(); // Assume endpoint returns the updated template
    },

    // onMutate uses templateId (string) as input now
    onMutate: async (
      templateId: string,
    ): Promise<ToggleFavoriteContext | undefined> => {
      console.log(`useToggleFavorite: onMutate running for ${templateId}`);
      await queryClient.cancelQueries({ queryKey: ['json-templates'] });
      await queryClient.cancelQueries({ queryKey: ['json-template', templateId] });

      const previousTemplates = queryClient.getQueryData<WorkoutTemplate[]>([
        'json-templates',
      ]);
      const previousTemplate = queryClient.getQueryData<WorkoutTemplate>([
        'json-template',
        templateId,
      ]);

      // Optimistically update based on cache state
      const newFavoriteStatusOptimistic = !previousTemplate?.favorite;
      console.log(
        `useToggleFavorite: Optimistic update for ${templateId} to ${newFavoriteStatusOptimistic}`,
      );

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
      console.log(
        `useToggleFavorite: onSettled for ${templateId}, invalidating queries.`,
      );
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
      return response.json();
    },
    onSuccess: (updatedTemplate) => {
      // Invalidate the list and the specific template
      queryClient.invalidateQueries({ queryKey: ['json-templates'] });
      queryClient.invalidateQueries({
        queryKey: ['json-template', updatedTemplate.id],
      });
      // Optionally, update the specific template in the cache
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
    mutationFn: async (profileData: any) => {
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

    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['json-templates'] });
      queryClient.invalidateQueries({ queryKey: ['json-template'] });
    },
  });
};
