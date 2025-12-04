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
};

// =====================================================
// Query: Fetch History Logs
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
    staleTime: 1000 * 30, // 30 seconds - history should be relatively fresh
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


