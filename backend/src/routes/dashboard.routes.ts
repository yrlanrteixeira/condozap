import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'

type ComplaintData = {
  status: string
  priority: string
  category: string
  createdAt: Date
  resolvedAt: Date | null
}

type ResidentData = {
  tower: string
  type: string
  consentWhatsapp: boolean
}

type MessageData = {
  recipientCount: number | null
  whatsappStatus: string | null
  sentAt: Date
}

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // Get dashboard metrics
  fastify.get('/:condominiumId/metrics', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { condominiumId } = request.params as { condominiumId: string }

    // Fetch all data in parallel
    const [complaints, residents, messages] = await Promise.all([
      prisma.complaint.findMany({
        where: { condominiumId },
        select: {
          status: true,
          priority: true,
          category: true,
          createdAt: true,
          resolvedAt: true,
        },
      }),
      prisma.resident.findMany({
        where: { condominiumId },
        select: {
          tower: true,
          type: true,
          consentWhatsapp: true,
        },
      }),
      prisma.message.findMany({
        where: { condominiumId },
        select: {
          recipientCount: true,
          whatsappStatus: true,
          sentAt: true,
        },
      }),
    ])

    // Calculate metrics
    const metrics = {
      complaints: {
        total: complaints.length,
        open: complaints.filter((c: ComplaintData) => c.status === 'OPEN').length,
        inProgress: complaints.filter((c: ComplaintData) => c.status === 'IN_PROGRESS').length,
        resolved: complaints.filter((c: ComplaintData) => c.status === 'RESOLVED').length,
        byPriority: {
          CRITICAL: complaints.filter((c: ComplaintData) => c.priority === 'CRITICAL').length,
          HIGH: complaints.filter((c: ComplaintData) => c.priority === 'HIGH').length,
          MEDIUM: complaints.filter((c: ComplaintData) => c.priority === 'MEDIUM').length,
          LOW: complaints.filter((c: ComplaintData) => c.priority === 'LOW').length,
        },
        byCategory: complaints.reduce((acc: Record<string, number>, c: ComplaintData) => {
          acc[c.category] = (acc[c.category] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      },
      residents: {
        total: residents.length,
        withConsent: residents.filter((r: ResidentData) => r.consentWhatsapp).length,
        byType: {
          owner: residents.filter((r: ResidentData) => r.type === 'OWNER').length,
          tenant: residents.filter((r: ResidentData) => r.type === 'TENANT').length,
        },
        byTower: residents.reduce((acc: Record<string, number>, r: ResidentData) => {
          acc[r.tower] = (acc[r.tower] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      },
      messages: {
        totalSent: messages.length,
        totalRecipients: messages.reduce((sum: number, m: MessageData) => sum + (m.recipientCount || 0), 0),
        deliveryRate: messages.length > 0
          ? (messages.filter((m: MessageData) => m.whatsappStatus === 'DELIVERED' || m.whatsappStatus === 'READ').length / messages.length) * 100
          : 0,
        last7Days: messages.filter((m: MessageData) => {
          const sentDate = new Date(m.sentAt)
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          return sentDate >= sevenDaysAgo
        }).length,
      },
    }

    return reply.send(metrics)
  })
}
