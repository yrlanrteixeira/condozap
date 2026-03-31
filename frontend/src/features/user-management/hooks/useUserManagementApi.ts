/**
 * User Management API Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CondominiumUser,
  CreateAdminInput,
  CreateSectorMemberInput,
  CreateSyndicInput,
  UpdateSyndicInput,
  UpdateUserRoleInput,
  UpdateCouncilPositionInput,
  RemoveUserInput,
  InviteUserInput,
} from '../types';

const queryKeys = {
  all: ['userManagement'] as const,
  list: (condominiumId: string) => [...queryKeys.all, 'list', condominiumId] as const,
};

/**
 * Hook para listar usuários do condomínio
 */
export function useCondominiumUsers(condominiumId: string) {
  return useQuery({
    queryKey: queryKeys.list(condominiumId),
    queryFn: async (): Promise<CondominiumUser[]> => {
      const { data } = await api.get(`/users/condominium/${condominiumId}`);
      return data;
    },
    enabled: !!condominiumId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook para criar um novo admin
 */
export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAdminInput) => {
      const { data } = await api.post('/users/create-admin', input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.list(variables.condominiumId),
      });
    },
  });
}

/**
 * Cria usuário SETOR_MEMBER vinculado a um setor (síndico, profissional ou SUPER_ADMIN).
 */
export function useCreateSectorMemberUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSectorMemberInput) => {
      const { data } = await api.post('/users/create-sector-member', input);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.list(variables.condominiumId),
      });
      queryClient.invalidateQueries({
        queryKey: ['sectors', variables.condominiumId],
      });
    },
  });
}

/**
 * Hook para criar um novo síndico (SUPER_ADMIN only)
 */
export function useCreateSyndic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSyndicInput) => {
      const { data } = await api.post('/users/create-syndic', input);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidar queries de todos os condomínios afetados
      variables.condominiumIds.forEach(condoId => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.list(condoId),
        });
      });
      // Invalidar todas as queries de user management
      queryClient.invalidateQueries({
        queryKey: queryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: ['platform', 'syndics'],
      });
    },
  });
}

export type UpdateSyndicVariables = { userId: string } & UpdateSyndicInput;

/**
 * Atualizar síndico (SUPER_ADMIN only)
 */
export function useUpdateSyndic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, ...input }: UpdateSyndicVariables) => {
      const payload = {
        name: input.name,
        email: input.email,
        role: input.role,
        condominiumIds: input.condominiumIds,
        ...(input.password && input.password.length > 0
          ? { password: input.password }
          : {}),
      };
      const { data } = await api.patch(`/users/syndics/${userId}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      variables.condominiumIds.forEach((condoId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.list(condoId),
        });
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: ['platform', 'syndics'],
      });
    },
  });
}

/**
 * Hook para atualizar role de um usuário
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUserRoleInput) => {
      const { data } = await api.patch('/users/update-role', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.all,
      });
    },
  });
}

/**
 * Atualiza a função do membro no condomínio (`councilPosition`).
 */
export function useUpdateCouncilPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCouncilPositionInput) => {
      const { data } = await api.patch('/users/update-council-position', input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.list(variables.condominiumId),
      });
    },
  });
}

/**
 * Hook para remover usuário do condomínio
 */
export function useRemoveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RemoveUserInput) => {
      const { data } = await api.delete('/users/remove', { data: input });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.list(variables.condominiumId),
      });
    },
  });
}

/**
 * Hook para convidar usuário existente
 */
export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InviteUserInput) => {
      const { data } = await api.post('/users/invite', input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.list(variables.condominiumId),
      });
    },
  });
}

