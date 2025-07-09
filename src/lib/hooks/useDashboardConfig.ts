import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardConfig, DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard-config';
import { toast } from 'react-hot-toast';

/**
 * Hook to manage dashboard configuration
 */
export const useDashboardConfig = () => {
  const queryClient = useQueryClient();

  // Fetch current dashboard configuration
  const { data: config, isLoading, error } = useQuery<DashboardConfig>({
    queryKey: ['dashboardConfig'],
    queryFn: async () => {
      const response = await fetch('/api/user/dashboard-config');
      
      if (!response.ok) {
        if (response.status === 404) {
          // No config found, return default
          return DEFAULT_DASHBOARD_CONFIG;
        }
        throw new Error('Failed to fetch dashboard configuration');
      }
      
      return response.json();
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
      queryClient.invalidateQueries({ queryKey: ['dashboardConfig'] });
      toast.success('Dashboard settings saved!');
    },
    onError: (error) => {
      toast.error('Failed to save dashboard settings');
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
