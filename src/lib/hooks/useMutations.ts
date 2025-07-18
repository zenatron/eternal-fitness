// 🚀 STREAMLINED MUTATIONS
// Re-export from the new unified hooks

export {
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useToggleTemplateFavorite,
  useToggleTemplateFavorite as useToggleFavorite, // Legacy alias
  useDuplicateTemplate
} from './template-hooks';

export {
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useStartSession,
  useCompleteSession,
  useUpdateActiveSession
} from './session-hooks';

export {
  useCreateProfile,
  useUpdateProfile,
  useDeleteProfile
} from './profile-hooks';

import { WorkoutTemplate, WorkoutType, Difficulty } from '@/types/workout';

// 🚀 TEMPLATE INPUT DATA TYPES
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
      reps?: number;
      weight?: number;
      duration?: number;
      distance?: number;
      calories?: number;
      heartRate?: number;
      pace?: number;
      incline?: number;
      resistance?: number;
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

// Legacy hooks - use the new streamlined versions from template-hooks.ts and session-hooks.ts instead
