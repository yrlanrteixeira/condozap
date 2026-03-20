/**
 * Condominiums API Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  createQuery,
  createMutationWithInvalidation,
} from '@/shared/hooks/useApiFactory';
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
export const useCondominiums = createQuery({
  queryKey: (options?: { enabled?: boolean }) => queryKeys.list(),
  queryFn: async (_options?: { enabled?: boolean }): Promise<Condominium[]> => {
    const { data } = await api.get('/condominiums');
    return data;
  },
  // Note: the original had an `enabled` option passed at call-site;
  // we preserve that by allowing it but defaulting to true.
  enabled: (options?: { enabled?: boolean }) => options?.enabled !== false,
  staleTime: 1000 * 60 * 5,
});

/**
 * Hook to fetch single condominium
 */
export const useCondominium = createQuery({
  queryKey: (id: string) => queryKeys.detail(id),
  queryFn: async (id: string): Promise<Condominium> => {
    const { data } = await api.get(`/condominiums/${id}`);
    return data;
  },
  enabled: (id: string) => !!id,
});

/**
 * Hook to fetch condominium stats
 */
export const useCondominiumStats = createQuery({
  queryKey: (id: string) => queryKeys.stats(id),
  queryFn: async (id: string): Promise<CondominiumStats> => {
    const { data } = await api.get(`/condominiums/${id}/stats`);
    return data;
  },
  enabled: (id: string) => !!id,
  staleTime: 1000 * 60 * 2,
});

/**
 * Hook to create condominium
 */
export const useCreateCondominium = createMutationWithInvalidation<
  CreateCondominiumInput,
  Condominium
>({
  mutationFn: async (input) => {
    const { data } = await api.post('/condominiums', input);
    return data;
  },
  invalidateKeys: () => [queryKeys.list()],
});

/**
 * Hook to update condominium
 */
export const useUpdateCondominium = createMutationWithInvalidation<
  UpdateCondominiumInput & { id: string },
  Condominium
>({
  mutationFn: async ({ id, ...input }) => {
    const { data } = await api.patch(`/condominiums/${id}`, input);
    return data;
  },
  invalidateKeys: (data) => [queryKeys.list(), queryKeys.detail(data.id)],
});

/**
 * Hook to delete condominium
 */
export const useDeleteCondominium = createMutationWithInvalidation<string, void>({
  mutationFn: async (id) => {
    await api.delete(`/condominiums/${id}`);
  },
  invalidateKeys: () => [queryKeys.list()],
});
