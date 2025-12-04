/**
 * Condominiums API Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Condominium,
  CreateCondominiumInput,
  UpdateCondominiumInput,
  CondominiumStats,
} from '../types';

const queryKeys = {
  all: ['condominiums'] as const,
  list: () => [...queryKeys.all, 'list'] as const,
  detail: (id: string) => [...queryKeys.all, 'detail', id] as const,
  stats: (id: string) => [...queryKeys.all, 'stats', id] as const,
};

/**
 * Hook to fetch all condominiums
 */
export function useCondominiums() {
  return useQuery({
    queryKey: queryKeys.list(),
    queryFn: async (): Promise<Condominium[]> => {
      const { data } = await api.get('/condominiums');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch single condominium
 */
export function useCondominium(id: string) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: async (): Promise<Condominium> => {
      const { data } = await api.get(`/condominiums/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch condominium stats
 */
export function useCondominiumStats(id: string) {
  return useQuery({
    queryKey: queryKeys.stats(id),
    queryFn: async (): Promise<CondominiumStats> => {
      const { data } = await api.get(`/condominiums/${id}/stats`);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to create condominium
 */
export function useCreateCondominium() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCondominiumInput): Promise<Condominium> => {
      const { data } = await api.post('/condominiums', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list() });
    },
  });
}

/**
 * Hook to update condominium
 */
export function useUpdateCondominium() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateCondominiumInput & { id: string }): Promise<Condominium> => {
      const { data } = await api.patch(`/condominiums/${id}`, input);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(data.id) });
    },
  });
}

/**
 * Hook to delete condominium
 */
export function useDeleteCondominium() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/condominiums/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list() });
    },
  });
}

