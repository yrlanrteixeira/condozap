/**
 * React Query hooks for Dashboard Metrics
 * Aggregates data from complaints, residents, and messages
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ComplaintStatus, ComplaintPriority } from '@/types'

// =====================================================
// Types
// =====================================================

interface DashboardMetrics {
  complaints: {
    total: number
    open: number
    inProgress: number
    resolved: number
    byPriority: Record<ComplaintPriority, number>
    byCategory: Record<string, number>
    avgResolutionTime: number // in hours
  }
  residents: {
    total: number
    withConsent: number
    byType: {
      owner: number
      tenant: number
    }
    byTower: Record<string, number>
  }
  messages: {
    totalSent: number
    totalRecipients: number
    deliveryRate: number
    last7Days: number
  }
  urgentFeed: Array<{
    id: number
    type: 'complaint'
    category: string
    content: string
    priority: ComplaintPriority
    createdAt: string
    residentName?: string
  }>
}

// =====================================================
// Query: Fetch Dashboard Metrics
// =====================================================

export function useDashboardMetrics(condominiumId: string) {
  return useQuery({
    queryKey: ['dashboardMetrics', condominiumId],
    queryFn: async (): Promise<DashboardMetrics> => {
      // Fetch all data in parallel
      const [complaintsData, residentsData, messagesData] = await Promise.all([
        fetchComplaintsMetrics(condominiumId),
        fetchResidentsMetrics(condominiumId),
        fetchMessagesMetrics(condominiumId),
      ])

      // Fetch urgent feed
      const urgentFeed = await fetchUrgentFeed(condominiumId)

      return {
        complaints: complaintsData,
        residents: residentsData,
        messages: messagesData,
        urgentFeed,
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  })
}

// =====================================================
// Helper: Fetch Complaints Metrics
// =====================================================

async function fetchComplaintsMetrics(condominiumId: string) {
  const { data: complaints, error } = await supabase
    .from('complaints')
    .select('status, priority, category, created_at, resolved_at')
    .eq('condominium_id', condominiumId)

  if (error) {
    throw new Error(`Failed to fetch complaints metrics: ${error.message}`)
  }

  const total = complaints.length
  const open = complaints.filter(c => c.status === 'OPEN').length
  const inProgress = complaints.filter(c => c.status === 'IN_PROGRESS').length
  const resolved = complaints.filter(c => c.status === 'RESOLVED').length

  // Group by priority
  const byPriority: Record<ComplaintPriority, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  }
  complaints.forEach(c => {
    if (c.priority) {
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1
    }
  })

  // Group by category
  const byCategory: Record<string, number> = {}
  complaints.forEach(c => {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1
  })

  // Calculate average resolution time
  const resolvedComplaints = complaints.filter(c => c.status === 'RESOLVED' && c.resolved_at)
  const avgResolutionTime = resolvedComplaints.length > 0
    ? resolvedComplaints.reduce((sum, c) => {
        const createdAt = new Date(c.created_at).getTime()
        const resolvedAt = new Date(c.resolved_at!).getTime()
        return sum + (resolvedAt - createdAt)
      }, 0) / resolvedComplaints.length / (1000 * 60 * 60) // Convert to hours
    : 0

  return {
    total,
    open,
    inProgress,
    resolved,
    byPriority,
    byCategory,
    avgResolutionTime: Math.round(avgResolutionTime * 10) / 10, // Round to 1 decimal
  }
}

// =====================================================
// Helper: Fetch Residents Metrics
// =====================================================

async function fetchResidentsMetrics(condominiumId: string) {
  const { data: residents, error } = await supabase
    .from('residents')
    .select('type, tower, consent_whatsapp')
    .eq('condominium_id', condominiumId)

  if (error) {
    throw new Error(`Failed to fetch residents metrics: ${error.message}`)
  }

  const total = residents.length
  const withConsent = residents.filter(r => r.consent_whatsapp).length

  const byType = {
    owner: residents.filter(r => r.type === 'OWNER').length,
    tenant: residents.filter(r => r.type === 'TENANT').length,
  }

  const byTower: Record<string, number> = {}
  residents.forEach(r => {
    byTower[r.tower] = (byTower[r.tower] || 0) + 1
  })

  return {
    total,
    withConsent,
    byType,
    byTower,
  }
}

// =====================================================
// Helper: Fetch Messages Metrics
// =====================================================

async function fetchMessagesMetrics(condominiumId: string) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: messages, error } = await supabase
    .from('messages')
    .select('recipient_count, whatsapp_status, sent_at')
    .eq('condominium_id', condominiumId)

  if (error) {
    throw new Error(`Failed to fetch messages metrics: ${error.message}`)
  }

  const totalSent = messages.length
  const totalRecipients = messages.reduce((sum, m) => sum + (m.recipient_count || 0), 0)

  const deliveredCount = messages.filter(
    m => m.whatsapp_status === 'DELIVERED' || m.whatsapp_status === 'READ'
  ).length

  const deliveryRate = totalSent > 0 ? (deliveredCount / totalSent) * 100 : 0

  const last7Days = messages.filter(m => {
    const sentAt = new Date(m.sent_at)
    return sentAt >= sevenDaysAgo
  }).length

  return {
    totalSent,
    totalRecipients,
    deliveryRate: Math.round(deliveryRate * 10) / 10,
    last7Days,
  }
}

// =====================================================
// Helper: Fetch Urgent Feed
// =====================================================

async function fetchUrgentFeed(condominiumId: string) {
  const { data: complaints, error } = await supabase
    .from('complaints')
    .select(`
      id,
      category,
      content,
      priority,
      created_at,
      resident:residents(name)
    `)
    .eq('condominium_id', condominiumId)
    .in('status', ['OPEN', 'IN_PROGRESS'])
    .in('priority', ['CRITICAL', 'HIGH'])
    .order('priority', { ascending: true }) // CRITICAL first
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    throw new Error(`Failed to fetch urgent feed: ${error.message}`)
  }

  return complaints.map(c => ({
    id: c.id,
    type: 'complaint' as const,
    category: c.category,
    content: c.content,
    priority: c.priority as ComplaintPriority,
    createdAt: c.created_at,
    residentName: c.resident?.name,
  }))
}

// =====================================================
// Query: Professional Syndic Unified Dashboard
// =====================================================

export function useUnifiedDashboard(condominiumIds: string[]) {
  return useQuery({
    queryKey: ['unifiedDashboard', condominiumIds],
    queryFn: async () => {
      // Fetch metrics for all condominiums in parallel
      const metricsPromises = condominiumIds.map(async (id) => {
        const metrics = await useDashboardMetrics(id).queryFn!()

        // Fetch condominium name
        const { data: condo } = await supabase
          .from('condominiums')
          .select('name')
          .eq('id', id)
          .single()

        return {
          condominiumId: id,
          condominiumName: condo?.name || 'Unknown',
          metrics,
        }
      })

      const results = await Promise.all(metricsPromises)

      // Aggregate totals
      const totals = {
        complaints: {
          total: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          critical: 0,
        },
        residents: {
          total: 0,
          withConsent: 0,
        },
        messages: {
          totalSent: 0,
          last7Days: 0,
        },
      }

      results.forEach(r => {
        totals.complaints.total += r.metrics.complaints.total
        totals.complaints.open += r.metrics.complaints.open
        totals.complaints.inProgress += r.metrics.complaints.inProgress
        totals.complaints.resolved += r.metrics.complaints.resolved
        totals.complaints.critical += r.metrics.complaints.byPriority.CRITICAL || 0

        totals.residents.total += r.metrics.residents.total
        totals.residents.withConsent += r.metrics.residents.withConsent

        totals.messages.totalSent += r.metrics.messages.totalSent
        totals.messages.last7Days += r.metrics.messages.last7Days
      })

      return {
        condominiums: results,
        totals,
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: condominiumIds.length > 0,
  })
}
