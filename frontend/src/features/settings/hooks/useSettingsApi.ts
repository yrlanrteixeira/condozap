/**
 * Settings API Hooks
 * Perfil, notificações, senha e configurações do condomínio
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User } from '@/types';

export interface UpdateProfileInput {
  name?: string;
  consentWhatsapp?: boolean;
  consentDataProcessing?: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UpdateCondominiumSettingsInput {
  name?: string;
  whatsappPhone?: string | null;
  whatsappBusinessId?: string | null;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileInput): Promise<User> => {
      const { data: user } = await api.patch<User>('/auth/me', data);
      return user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordInput): Promise<{ message: string }> => {
      const { data: res } = await api.patch<{ message: string }>('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmNewPassword,
      });
      return res;
    },
  });
}

export function useUpdateCondominiumSettings(condominiumId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: UpdateCondominiumSettingsInput
    ): Promise<unknown> => {
      const { data: condo } = await api.patch(
        `/condominiums/${condominiumId}/settings`,
        data
      );
      return condo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      queryClient.invalidateQueries({
        queryKey: ['condominiums', 'detail', condominiumId],
      });
    },
  });
}
