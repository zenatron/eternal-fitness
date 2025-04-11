import { DashboardData } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';

/**
 * Custom hook to fetch and provide dashboard data from the API
 */
export const useDashboardData = () => {
  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard');

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to fetch dashboard data');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: 'always',
  });

  return {
    data,
    loading: isLoading,
    error,
    refetch,
  };
};
