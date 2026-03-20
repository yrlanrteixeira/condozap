/**
 * Dashboard Feature - API Hooks
 */

import { api } from '@/lib/api';
import { createQuery } from '@/shared/hooks/useApiFactory';
import { queryKeys } from '../utils/queryKeys';
import type { DashboardMetrics, UnifiedDashboardMetrics } from '../types';

// =====================================================
// Query: Fetch Dashboard Metrics
// =====================================================

export const useDashboardMetrics = createQuery({
  queryKey: (condominiumId: string | 'all') => queryKeys.metrics(condominiumId),
  queryFn: async (condominiumId: string | 'all'): Promise<DashboardMetrics> => {
    const url =
      condominiumId === 'all'
        ? '/dashboard/metrics/all'
        : `/dashboard/metrics/${condominiumId}`;
    const { data } = await api.get(url);
    return data;
  },
  enabled: (condominiumId: string | 'all') => !!condominiumId,
  staleTime: 1000 * 60 * 5,
  refetchInterval: 1000 * 60 * 5,
});

// =====================================================
// Query: Professional Syndic Unified Dashboard
// =====================================================

export const useUnifiedDashboard = createQuery({
  queryKey: (condominiumIds: string[]) => queryKeys.unified(condominiumIds),
  queryFn: async (condominiumIds: string[]): Promise<UnifiedDashboardMetrics> => {
    const { data } = await api.get('/dashboard/unified', {
      params: { condominiumIds: condominiumIds.join(',') },
    });
    return data;
  },
  staleTime: 1000 * 60 * 5,
  enabled: (condominiumIds: string[]) => condominiumIds.length > 0,
});
