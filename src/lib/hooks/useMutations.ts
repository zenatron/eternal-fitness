import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkoutTemplate } from '@/types/workout';

// Updated interface structure for create/update
export interface TemplateInputData {
  name: string;
  favorite?: boolean;
  scheduledDate?: string | null;
  sets: { 
    exercises: string[]; // Array of exercise IDs
    reps: number;
    weight: number;
    duration?: number | null;
  }[];
  totalVolume?: number;
}

// EXPORT this interface too
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
      console.log(`useToggleFavorite: Calling POST /api/template/${templateId}/favorite`);
      const response = await fetch(`/api/template/${templateId}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Content-Type might not be strictly necessary for POST with no body, but good practice
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to toggle favorite (status ${response.status})` }));
        console.error(`useToggleFavorite: Failed POST request for ${templateId}/favorite:`, errorData);
        throw new Error(errorData?.error || 'Failed to toggle favorite status');
      }
      
      console.log(`useToggleFavorite: Successfully called POST for ${templateId}/favorite`);
      return response.json(); // Assume endpoint returns the updated template
    },
    
    // onMutate uses templateId (string) as input now
    onMutate: async (templateId: string): Promise<ToggleFavoriteContext | undefined> => {
      console.log(`useToggleFavorite: onMutate running for ${templateId}`);
      await queryClient.cancelQueries({ queryKey: ['templates'] });
      await queryClient.cancelQueries({ queryKey: ['template', templateId] });
      
      const previousTemplates = queryClient.getQueryData<WorkoutTemplate[]>(['templates']);
      const previousTemplate = queryClient.getQueryData<WorkoutTemplate>(['template', templateId]);
      
      // Optimistically update based on cache state
      const newFavoriteStatusOptimistic = !previousTemplate?.favorite; 
      console.log(`useToggleFavorite: Optimistic update for ${templateId} to ${newFavoriteStatusOptimistic}`);

      // Update the cache for the list view
      if (previousTemplates) {
        queryClient.setQueryData(['templates'], 
          previousTemplates.map(t => 
            t.id === templateId ? {...t, favorite: newFavoriteStatusOptimistic} : t
          )
        );
      }
      // Update the cache for the single template view (if it exists)
      if (previousTemplate) {
        queryClient.setQueryData(['template', templateId], 
          {...previousTemplate, favorite: newFavoriteStatusOptimistic}
        );
      }
      return { previousTemplates, previousTemplate }; 
    },
    
    // onError uses templateId (string) as variable now
    onError: (err, templateId, context: ToggleFavoriteContext | undefined) => {
      console.error(`useToggleFavorite: onError for ${templateId}, rolling back optimistic update. Error:`, err);
      if (context?.previousTemplates) {
        queryClient.setQueryData(['templates'], context.previousTemplates);
      }
      if (context?.previousTemplate) {
        queryClient.setQueryData(['template', templateId], context.previousTemplate);
      }
    },
    
    onSettled: (templateId) => {
      console.log(`useToggleFavorite: onSettled for ${templateId}, invalidating queries.`);
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
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
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
           const errorData = JSON.parse(errorText);
           throw new Error(errorData?.error || `Failed to delete template (status ${response.status})`);
        } catch (e) {
           throw new Error(`Failed to delete template: ${response.status} ${response.statusText}. ${errorText}`);
        }
      }
      return templateId;
    },
    
    onSuccess: (deletedTemplateId) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.removeQueries({ queryKey: ['template', deletedTemplateId] });
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
      const response = await fetch('/api/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create template' }));
        throw new Error(errorData.error);
      }
      return response.json();
    },
    onSuccess: (newTemplate) => {
      // Invalidate the list of templates to refetch
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      // Optionally, add the new template to the cache immediately
      queryClient.setQueryData(['template', newTemplate.id], newTemplate);
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
        const errorData = await response.json().catch(() => ({ error: 'Failed to update template' }));
        throw new Error(errorData.error);
      }
      return response.json();
    },
    onSuccess: (updatedTemplate) => {
      // Invalidate the list and the specific template
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', updatedTemplate.id] });
      // Optionally, update the specific template in the cache
      queryClient.setQueryData(['template', updatedTemplate.id], updatedTemplate);
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
        body: JSON.stringify(profileData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update profile');
      }
      
      return response.json();
    },
    
    onSuccess: () => {
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
    
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template'] });
    },
  });
}; 