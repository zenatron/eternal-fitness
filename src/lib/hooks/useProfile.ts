import { useQuery } from '@tanstack/react-query';

/**
 * Custom hook to fetch and provide user profile
 */
export const useProfile = () => {
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await fetch('/api/profile');

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // If profile not found (404), return null instead of throwing error
        if (response.status === 404) {
          return null;
        }

        throw new Error(errorData?.error?.message || errorData?.error || 'Failed to fetch profile');
      }
      const responseData = await response.json();
      return responseData.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetches during profile setup flow
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
  };
};
