import { DashboardData } from '@/types/dashboard';
import { queryKeys } from '@/lib/queryKeys';
import { useQuery } from '@tanstack/react-query';

/**
 * Custom hook to fetch and provide dashboard data from the API
 */
export const useDashboardData = () => {
  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: queryKeys.dashboardData,
    queryFn: async () => {
      const response = await fetch('/api/dashboard');

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to fetch dashboard data');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    // No `refetchOnWindowFocus: 'always'` here: it refetched the heaviest
    // aggregate in the app on every tab focus even while fresh, which is the
    // exact storm the global default (refetchOnWindowFocus: true, only when
    // stale) was changed to fix.
  });

  return {
    data,
    loading: isLoading,
    error,
    refetch,
  };
};
