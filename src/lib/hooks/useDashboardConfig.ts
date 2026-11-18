import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { DashboardConfig, DEFAULT_DASHBOARD_CONFIG, withDefaultTiles } from '@/types/dashboard-config';
import { toast } from 'react-hot-toast';

/**
 * Hook to manage dashboard configuration
 */
export const useDashboardConfig = () => {
  const queryClient = useQueryClient();

  // Fetch current dashboard configuration
  const { data: config, isLoading, error } = useQuery<DashboardConfig>({
    queryKey: queryKeys.dashboardConfig,
    queryFn: async () => {
      const response = await fetch('/api/user/dashboard-config');
      
      if (!response.ok) {
        if (response.status === 404) {
          // No config found, return default
          return DEFAULT_DASHBOARD_CONFIG;
        }
        throw new Error('Failed to fetch dashboard configuration');
      }
      
      // Merged here too: a config persisted in the offline cache before a tile
      // existed would otherwise hide it until the next network fetch.
      return withDefaultTiles(await response.json());
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation to save dashboard configuration
  const saveMutation = useMutation({
    mutationFn: async (newConfig: DashboardConfig) => {
      const response = await fetch('/api/user/dashboard-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to save dashboard configuration');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardConfig });
      toast.success('Home screen saved');
    },
    onError: (error) => {
      toast.error("Couldn't save your home screen");
      console.error('Dashboard config save error:', error);
    },
  });

  return {
    config: config || DEFAULT_DASHBOARD_CONFIG,
    isLoading,
    error,
    saveConfig: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
};
