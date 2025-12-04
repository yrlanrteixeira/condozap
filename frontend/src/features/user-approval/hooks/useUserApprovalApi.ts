/**
 * User Approval API Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PendingUser, ApproveUserInput, RejectUserInput } from '../types';

const queryKeys = {
  all: ['userApproval'] as const,
  pending: (condominiumId: string) => [...queryKeys.all, 'pending', condominiumId] as const,
};

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


