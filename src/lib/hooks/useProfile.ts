import { useQuery } from '@tanstack/react-query';

/**
 * Custom hook to fetch and provide user profile
 */
export const useProfile = () => {
  const {
    data: profile,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await fetch('/api/profile');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to fetch profile');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    profile,
    isLoading,
    error,
    refetch
  };
}; 