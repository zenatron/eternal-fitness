// 🚀 UNIFIED API HOOKS
// Generic CRUD hooks using React Query for consistent data fetching

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, ApiClientError } from '@/lib/api-client';
import { toast } from 'sonner';

// ============================================================================
// GENERIC CRUD HOOKS
// ============================================================================

/**
 * Generic GET hook with React Query
 */
export function useApiQuery<T>(
  key: string | string[],
  endpoint: string,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<T, ApiClientError>, 'queryKey' | 'queryFn'>
) {
  const queryKey = Array.isArray(key) ? key : [key];
  
  return useQuery<T, ApiClientError>({
    queryKey: params ? [...queryKey, params] : queryKey,
    queryFn: () => apiGet<T>(endpoint, params),
    ...options,
  });
}

/**
 * Generic POST mutation hook
 */
export function useApiMutation<TData, TVariables = any>(
  endpoint: string,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: ApiClientError, variables: TVariables) => void;
    invalidateQueries?: string | string[];
    successMessage?: string;
    errorMessage?: string;
  } & Omit<UseMutationOptions<TData, ApiClientError, TVariables>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<TData, ApiClientError, TVariables>({
    mutationFn: (data: TVariables) => apiPost<TData>(endpoint, data),
    onSuccess: (data, variables) => {
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      
      if (options?.invalidateQueries) {
        const keys = Array.isArray(options.invalidateQueries) 
          ? options.invalidateQueries 
          : [options.invalidateQueries];
        keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      }
      
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      const message = options?.errorMessage || error.message || 'An error occurred';
      toast.error(message);
      options?.onError?.(error, variables);
    },
    ...options,
  });
}

/**
 * Generic PUT mutation hook
 */
export function useApiUpdateMutation<TData, TVariables = any>(
  endpoint: string,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: ApiClientError, variables: TVariables) => void;
    invalidateQueries?: string | string[];
    successMessage?: string;
    errorMessage?: string;
  } & Omit<UseMutationOptions<TData, ApiClientError, TVariables>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<TData, ApiClientError, TVariables>({
    mutationFn: (data: TVariables) => apiPut<TData>(endpoint, data),
    onSuccess: (data, variables) => {
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      
      if (options?.invalidateQueries) {
        const keys = Array.isArray(options.invalidateQueries) 
          ? options.invalidateQueries 
          : [options.invalidateQueries];
        keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      }
      
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      const message = options?.errorMessage || error.message || 'An error occurred';
      toast.error(message);
      options?.onError?.(error, variables);
    },
    ...options,
  });
}

/**
 * Generic PATCH mutation hook
 */
export function useApiPatchMutation<TData, TVariables = any>(
  endpoint: string,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: ApiClientError, variables: TVariables) => void;
    invalidateQueries?: string | string[];
    successMessage?: string;
    errorMessage?: string;
  } & Omit<UseMutationOptions<TData, ApiClientError, TVariables>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiClientError, TVariables>({
    mutationFn: (data: TVariables) => apiPatch<TData>(endpoint, data),
    onSuccess: (data, variables) => {
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }

      if (options?.invalidateQueries) {
        const keys = Array.isArray(options.invalidateQueries)
          ? options.invalidateQueries
          : [options.invalidateQueries];
        keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      }

      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      const message = options?.errorMessage || error.message || 'An error occurred';
      toast.error(message);
      options?.onError?.(error, variables);
    },
    ...options,
  });
}

/**
 * Generic DELETE mutation hook
 */
export function useApiDeleteMutation<TData = any>(
  endpoint: string,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: ApiClientError) => void;
    invalidateQueries?: string | string[];
    successMessage?: string;
    errorMessage?: string;
  } & Omit<UseMutationOptions<TData, ApiClientError, void>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<TData, ApiClientError, void>({
    mutationFn: () => apiDelete<TData>(endpoint),
    onSuccess: (data) => {
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      
      if (options?.invalidateQueries) {
        const keys = Array.isArray(options.invalidateQueries) 
          ? options.invalidateQueries 
          : [options.invalidateQueries];
        keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      }
      
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      const message = options?.errorMessage || error.message || 'An error occurred';
      toast.error(message);
      options?.onError?.(error);
    },
    ...options,
  });
}

// ============================================================================
// RESOURCE-SPECIFIC HOOKS
// ============================================================================

/**
 * Hook for fetching a list of resources
 */
export function useResourceList<T>(
  resource: string,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<T[], ApiClientError>, 'queryKey' | 'queryFn'>
) {
  return useApiQuery<T[]>(
    [resource, 'list'],
    `/${resource}`,
    params,
    options
  );
}

/**
 * Hook for fetching a single resource by ID
 */
export function useResource<T>(
  resource: string,
  id: string,
  options?: Omit<UseQueryOptions<T, ApiClientError>, 'queryKey' | 'queryFn'>
) {
  return useApiQuery<T>(
    [resource, id],
    `/${resource}/${id}`,
    undefined,
    {
      enabled: !!id,
      ...options,
    }
  );
}

/**
 * Hook for creating a new resource
 */
export function useCreateResource<TData, TVariables = any>(
  resource: string,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    successMessage?: string;
  }
) {
  return useApiMutation<TData, TVariables>(`/${resource}`, {
    invalidateQueries: [resource],
    successMessage: options?.successMessage || `${resource} created successfully`,
    ...options,
  });
}

/**
 * Hook for updating a resource
 */
export function useUpdateResource<TData, TVariables = any>(
  resource: string,
  id: string,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    successMessage?: string;
  }
) {
  return useApiUpdateMutation<TData, TVariables>(`/${resource}/${id}`, {
    invalidateQueries: [resource],
    successMessage: options?.successMessage || `${resource} updated successfully`,
    ...options,
  });
}

/**
 * Hook for deleting a resource
 */
export function useDeleteResource<TData = any>(
  resource: string,
  id: string,
  options?: {
    onSuccess?: (data: TData) => void;
    successMessage?: string;
  }
) {
  return useApiDeleteMutation<TData>(`/${resource}/${id}`, {
    invalidateQueries: [resource],
    successMessage: options?.successMessage || `${resource} deleted successfully`,
    ...options,
  });
}
