/**
 * Dashboard Feature - Type Definitions
 */

import type { ComplaintPriority } from '../../complaints/types'

export interface DashboardMetrics {
  complaints: {
    total: number
    open: number
    inProgress: number
    resolved: number
    byPriority: Record<ComplaintPriority, number>
    byCategory: Record<string, number>
    byTower: Record<string, number>
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
    delivered: number
    read: number
    failed: number
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

export interface UnifiedDashboardMetrics {
  condominiums: Array<{
    condominiumId: string
    condominiumName: string
    metrics: DashboardMetrics
  }>
  totals: {
    complaints: {
      total: number
      open: number
      inProgress: number
      resolved: number
      critical: number
    }
    residents: {
      total: number
      withConsent: number
    }
    messages: {
      totalSent: number
      last7Days: number
    }
  }
}


