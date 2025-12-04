/**
 * Evolution API Hooks
 * 
 * Hooks React Query para gerenciar a conexão com Evolution API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ConnectionStatus {
  connected: boolean;
  state: 'open' | 'close' | 'connecting';
  instanceName: string;
  error?: string;
}

interface QRCodeResponse {
  qrcode: string;
  pairingCode?: string;
  count?: number;
}

interface CheckNumberResult {
  number: string;
  onWhatsApp: boolean;
  jid?: string;
}

const queryKeys = {
  status: ['evolution', 'status'] as const,
  qrcode: ['evolution', 'qrcode'] as const,
};

/**
 * Hook para verificar status da conexão com WhatsApp
 */
export function useEvolutionStatus() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: async (): Promise<ConnectionStatus> => {
      const { data } = await api.get('/evolution/status');
      return data;
    },
    refetchInterval: (data) => {
      // Se não conectado, verificar a cada 5 segundos
      return data?.state?.connected ? 30000 : 5000;
    },
    staleTime: 5000,
  });
}

/**
 * Hook para obter QR Code
 */
export function useEvolutionQRCode(enabled: boolean = false) {
  return useQuery({
    queryKey: queryKeys.qrcode,
    queryFn: async (): Promise<QRCodeResponse> => {
      const { data } = await api.get('/evolution/qrcode');
      return data;
    },
    enabled,
    refetchInterval: 20000, // Atualizar QR Code a cada 20 segundos
    staleTime: 15000,
  });
}

/**
 * Hook para desconectar
 */
export function useEvolutionDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/evolution/disconnect');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

/**
 * Hook para reiniciar instância
 */
export function useEvolutionRestart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/evolution/restart');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

/**
 * Hook para enviar mensagem direta
 */
export function useEvolutionSendMessage() {
  return useMutation({
    mutationFn: async (input: { phone: string; message: string }) => {
      const { data } = await api.post('/evolution/send', input);
      return data;
    },
  });
}

/**
 * Hook para verificar números no WhatsApp
 */
export function useEvolutionCheckNumbers() {
  return useMutation({
    mutationFn: async (numbers: string[]): Promise<{ results: CheckNumberResult[] }> => {
      const { data } = await api.post('/evolution/check-numbers', { numbers });
      return data;
    },
  });
}

