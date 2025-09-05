// 🚀 UNIFIED HOOKS INDEX
// Single source of truth for all data fetching and mutation hooks

// ============================================================================
// CORE API HOOKS
// ============================================================================
export {
  useApiQuery,
  useApiMutation,
  useApiUpdateMutation,
  useApiPatchMutation,
  useApiDeleteMutation,
  useResourceList,
  useResource,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
} from './api-hooks';

// ============================================================================
// TEMPLATE HOOKS
// ============================================================================
export {
  useTemplates,
  useTemplate,
  useFavoriteTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useToggleTemplateFavorite,
  useDuplicateTemplate,
  useCompleteTemplate,
} from './template-hooks';

// ============================================================================
// SESSION HOOKS
// ============================================================================
export {
  useSessions,
  useSession,
  useRecentSessions,
  useScheduledSessions,
  useActiveSession,
  useStartSession,
  useUpdateActiveSession,
  useCompleteSession,
  usePauseResumeSession,
  useCancelSession,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useRecoverSession,
} from './session-hooks';

// ============================================================================
// PROFILE HOOKS
// ============================================================================
export {
  useProfile,
  useCreateProfile,
  useUpdateProfile,
  useDeleteProfile,
  type UserProfile,
  type ProfileUpdateData,
} from './profile-hooks';

// ============================================================================
// ACTIVE WORKOUT HOOKS
// ============================================================================
export {
  useActiveWorkout,
  useStartSession as useStartWorkout,
  useCompleteSession as useCompleteWorkout,
  useCancelSession as useEndWorkout,
  useUpdateActiveSession as useUpdateWorkout,
} from './useActiveWorkout';

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

// Re-export legacy hooks for backward compatibility
export { useTemplates as useTemplatesLegacy } from './useTemplates';
export { useTemplate as useTemplateLegacy } from './useTemplate';

// Legacy mutation types for backward compatibility
export type { TemplateInputData, UpdateTemplateArgs } from './useMutations';

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type { ApiClientError } from '../api-client';
