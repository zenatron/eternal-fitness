// 🚀 PROFILE-SPECIFIC HOOKS
// Specialized hooks for user profile CRUD operations

import { useApiQuery, useApiMutation, useApiUpdateMutation } from './api-hooks';

// ============================================================================
// PROFILE TYPES
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  useMetric: boolean;
  weightGoal?: number;
  points: number;
  workoutsCompleted: number;
  joinDate: Date;
  createdAt: Date;
}

export interface ProfileUpdateData {
  name: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  useMetric?: boolean;
  weightGoal?: number;
}

// ============================================================================
// PROFILE QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch user profile data
 */
export function useProfile() {
  return useApiQuery<UserProfile | null>(['profile'], '/profile', undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (profile not found)
      if (error?.status === 404) return false;
      return failureCount < 3;
    },
  });
}

// ============================================================================
// PROFILE MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new user profile
 */
export function useCreateProfile() {
  return useApiMutation<UserProfile, ProfileUpdateData>('/profile', {
    successMessage: 'Profile created successfully!',
    invalidateQueries: ['profile'],
  });
}

/**
 * Hook to update an existing user profile
 */
export function useUpdateProfile() {
  return useApiUpdateMutation<UserProfile, ProfileUpdateData>('/profile', {
    successMessage: 'Profile updated successfully!',
    invalidateQueries: ['profile'],
  });
}

/**
 * Hook to delete user profile
 */
export function useDeleteProfile() {
  return useApiMutation<void>('/profile', {
    successMessage: 'Profile deleted successfully!',
    invalidateQueries: ['profile'],
  });
}
