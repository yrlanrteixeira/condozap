/**
 * User Approval API Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PendingUser, ApproveUserInput, RejectUserInput, Condominium } from '../types';

const queryKeys = {
  all: ['userApproval'] as const,
  pendingAll: () => [...queryKeys.all, 'pending', 'all'] as const,
  pending: (condominiumId: string) => [...queryKeys.all, 'pending', condominiumId] as const,
  condominiums: () => [...queryKeys.all, 'condominiums'] as const,
};

/**
 * Hook to fetch all condominiums (SUPER_ADMIN only)
 */
export function useCondominiums(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.condominiums(),
    queryFn: async (): Promise<Condominium[]> => {
      const { data } = await api.get('/condominiums/list');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook to fetch ALL pending users (SUPER_ADMIN / PROFESSIONAL_SYNDIC)
 * Use enabled: false para ADMIN/SYNDIC para não chamar a API e evitar 403.
 */
export function useAllPendingUsers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.pendingAll(),
    queryFn: async (): Promise<PendingUser[]> => {
      const { data } = await api.get('/users/pending/all');
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook to fetch pending users for a condominium
 */
export function usePendingUsers(condominiumId: string) {
  return useQuery({
    queryKey: queryKeys.pending(condominiumId),
    queryFn: async (): Promise<PendingUser[]> => {
      const { data } = await api.get(`/users/pending/${condominiumId}`);
      return data;
    },
    enabled: !!condominiumId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to approve a user
 */
export function useApproveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ApproveUserInput) => {
      const { data } = await api.post('/users/approve', input);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate pending users list
      queryClient.invalidateQueries({
        queryKey: queryKeys.pending(variables.condominiumId),
      });
      // Also invalidate residents list as new resident was created
      queryClient.invalidateQueries({
        queryKey: ['residents', variables.condominiumId],
      });
    },
  });
}

/**
 * Hook to reject a user
 */
export function useRejectUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RejectUserInput) => {
      const { data } = await api.post('/users/reject', input);
      return data;
    },
    onSuccess: () => {
      // Invalidate all pending users queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.all,
      });
    },
  });
}


