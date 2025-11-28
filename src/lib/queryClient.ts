import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * React Query Client Configuration
 * Separa client state (Redux) de server state (React Query)
 *
 * Benefícios:
 * - Cache automático de dados do servidor
 * - Refetch em background
 * - Sincronização entre tabs
 * - Otimistic updates
 * - Retry automático em caso de falha
 */

const queryConfig: DefaultOptions = {
  queries: {
    // Refetch quando a janela ganha foco
    refetchOnWindowFocus: true,

    // Refetch quando a rede reconecta
    refetchOnReconnect: true,

    // Retry automático (3 tentativas com backoff exponencial)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Tempo de cache (5 minutos)
    staleTime: 5 * 60 * 1000,

    // Tempo de garbage collection (10 minutos)
    gcTime: 10 * 60 * 1000,

    // Refetch em segundo plano se os dados estão stale
    refetchOnMount: true,
  },

  mutations: {
    // Retry para mutations (1 tentativa apenas)
    retry: 1,

    // Mostrar erro no console em desenvolvimento
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error('[React Query] Mutation error:', error);
      }
    },
  },
};

export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

/**
 * Query Keys Factory
 * Centraliza todas as query keys para evitar duplicação
 *
 * Padrão:
 * - ['entity'] - Lista todos
 * - ['entity', id] - Detalhe específico
 * - ['entity', id, 'relation'] - Relações
 * - ['entity', { filters }] - Listas filtradas
 */
export const queryKeys = {
  // Complaints
  complaints: {
    all: ['complaints'] as const,
    lists: () => [...queryKeys.complaints.all, 'list'] as const,
    list: (condoId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.complaints.lists(), condoId, filters] as const,
    details: () => [...queryKeys.complaints.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.complaints.details(), id] as const,
    history: (id: number) => [...queryKeys.complaints.detail(id), 'history'] as const,
  },

  // Residents
  residents: {
    all: ['residents'] as const,
    lists: () => [...queryKeys.residents.all, 'list'] as const,
    list: (condoId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.residents.lists(), condoId, filters] as const,
    details: () => [...queryKeys.residents.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.residents.details(), id] as const,
  },

  // Messages
  messages: {
    all: ['messages'] as const,
    lists: () => [...queryKeys.messages.all, 'list'] as const,
    list: (condoId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.messages.lists(), condoId, filters] as const,
    details: () => [...queryKeys.messages.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.messages.details(), id] as const,
    batchStatus: (batchId: string) => [...queryKeys.messages.all, 'batch', batchId] as const,
  },

  // Condominiums
  condominiums: {
    all: ['condominiums'] as const,
    lists: () => [...queryKeys.condominiums.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.condominiums.lists(), filters] as const,
    details: () => [...queryKeys.condominiums.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.condominiums.details(), id] as const,
    metrics: (id: string) => [...queryKeys.condominiums.detail(id), 'metrics'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    metrics: (condoId: string) => [...queryKeys.dashboard.all, 'metrics', condoId] as const,
    urgentFeed: (condoId?: string) =>
      condoId
        ? [...queryKeys.dashboard.all, 'urgent-feed', condoId] as const
        : [...queryKeys.dashboard.all, 'urgent-feed'] as const,
    unifiedMetrics: () => [...queryKeys.dashboard.all, 'unified-metrics'] as const,
  },

  // WhatsApp
  whatsapp: {
    all: ['whatsapp'] as const,
    templates: () => [...queryKeys.whatsapp.all, 'templates'] as const,
    validatePhone: (phone: string) =>
      [...queryKeys.whatsapp.all, 'validate-phone', phone] as const,
  },
} as const;
