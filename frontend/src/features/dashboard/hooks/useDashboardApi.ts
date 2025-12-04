/**
 * Dashboard Feature - API Hooks
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '../utils/queryKeys'
import type { DashboardMetrics, UnifiedDashboardMetrics } from '../types'

// =====================================================
// Query: Fetch Dashboard Metrics
// =====================================================

export function useDashboardMetrics(condominiumId: string | 'all') {
  return useQuery({
    queryKey: queryKeys.metrics(condominiumId),
    queryFn: async (): Promise<DashboardMetrics> => {
      const url = condominiumId === 'all' ? '/dashboard/metrics/all' : `/dashboard/metrics/${condominiumId}`;
      const { data } = await api.get(url)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  })
}

// =====================================================
// Query: Professional Syndic Unified Dashboard
// =====================================================

export function useUnifiedDashboard(condominiumIds: string[]) {
  return useQuery({
    queryKey: queryKeys.unified(condominiumIds),
    queryFn: async (): Promise<UnifiedDashboardMetrics> => {
      const { data } = await api.get('/dashboard/unified', {
        params: { condominiumIds: condominiumIds.join(',') }
      })
      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: condominiumIds.length > 0,
  })
}


