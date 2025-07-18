// 🚀 TEMPLATE-SPECIFIC HOOKS
// Specialized hooks for workout template CRUD operations

import { useResourceList, useResource, useCreateResource, useUpdateResource, useDeleteResource } from './api-hooks';
import { WorkoutTemplate } from '@/types/workout';

// ============================================================================
// TEMPLATE QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch all workout templates for the current user
 */
export function useTemplates() {
  return useResourceList<WorkoutTemplate>('template', undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single workout template by ID
 */
export function useTemplate(templateId: string) {
  return useResource<WorkoutTemplate>('template', templateId, {
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch favorite templates only
 */
export function useFavoriteTemplates() {
  return useResourceList<WorkoutTemplate>('template', { favorite: true }, {
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// TEMPLATE MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new workout template
 */
export function useCreateTemplate() {
  return useCreateResource<WorkoutTemplate>('template', {
    successMessage: 'Template created successfully!',
  });
}

/**
 * Hook to update an existing workout template
 */
export function useUpdateTemplate(templateId: string) {
  return useUpdateResource<WorkoutTemplate>('template', templateId, {
    successMessage: 'Template updated successfully!',
  });
}

/**
 * Hook to delete a workout template
 */
export function useDeleteTemplate(templateId: string) {
  return useDeleteResource('template', templateId, {
    successMessage: 'Template deleted successfully!',
  });
}

/**
 * Hook to toggle template favorite status
 */
export function useToggleTemplateFavorite(templateId: string) {
  return useUpdateResource<WorkoutTemplate>('template', templateId, {
    successMessage: 'Template favorite status updated!',
  });
}

// ============================================================================
// SPECIALIZED TEMPLATE OPERATIONS
// ============================================================================

/**
 * Hook to duplicate a workout template
 */
export function useDuplicateTemplate() {
  return useCreateResource<WorkoutTemplate>('template', {
    successMessage: 'Template duplicated successfully!',
  });
}

/**
 * Hook to complete a template (create workout session)
 */
export function useCompleteTemplate(templateId: string) {
  return useCreateResource(`template/${templateId}/complete`, {
    successMessage: 'Workout completed successfully!',
    onSuccess: () => {
      // Manual cache invalidation since invalidateQueries isn't supported in base hook
      // This will be handled by the mutation's onSuccess callback
    }
  });
}
