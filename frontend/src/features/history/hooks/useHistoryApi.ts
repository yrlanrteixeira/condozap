/**
 * History Feature - API Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { HistoryLog, HistoryFilters } from '../types';

// =====================================================
// Query Keys
// =====================================================

const historyQueryKeys = {
  all: ['history'] as const,
  lists: () => [...historyQueryKeys.all, 'list'] as const,
  list: (condominiumId: string, filters?: HistoryFilters) => 
    [...historyQueryKeys.lists(), condominiumId, filters] as const,
  detail: (id: string) => [...historyQueryKeys.all, 'detail', id] as const,
  activity: (condominiumId: string) => [...historyQueryKeys.all, 'activity', condominiumId] as const,
};

// =====================================================
// Query: Fetch History Logs (legacy - complaint status)
// =====================================================

export function useHistory(condominiumId: string, filters?: HistoryFilters) {
  const isGlobal = condominiumId === 'all';
  const endpoint = isGlobal ? '/history/all' : `/history/${condominiumId}`;

  return useQuery({
    queryKey: historyQueryKeys.list(condominiumId, filters),
    queryFn: async () => {
      const { data } = await api.get(endpoint, {
        params: filters,
      });
      return data as HistoryLog[];
    },
    enabled: !!condominiumId,
    staleTime: 1000 * 30,
  });
}

// =====================================================
// Query: Fetch Activity Logs (new - messages, complaints, residents)
// =====================================================

export interface ActivityLog {
  id: string;
  condominiumId: string;
  userId: string;
  userName: string | null;
  type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  targetId: string | null;
  targetType: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export function useActivityLogs(condominiumId: string, options?: {
  type?: string;
  limit?: number;
}) {
  const endpoint = `/history/activity/${condominiumId}`;

  return useQuery({
    queryKey: historyQueryKeys.activity(condominiumId),
    queryFn: async () => {
      const { data } = await api.get(endpoint, {
        params: {
          ...(options?.type && { type: options.type }),
          ...(options?.limit && { limit: options.limit }),
        },
      });
      return data as ActivityLog[];
    },
    enabled: !!condominiumId && condominiumId !== 'all',
    staleTime: 1000 * 30,
  });
}

// =====================================================
// Query: Fetch Single History Log
// =====================================================

export function useHistoryLog(logId: string) {
  return useQuery({
    queryKey: historyQueryKeys.detail(logId),
    queryFn: async () => {
      const { data } = await api.get(`/history/logs/${logId}`);
      return data as HistoryLog;
    },
    enabled: !!logId,
  });
}

export { historyQueryKeys };


