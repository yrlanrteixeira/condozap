import { FastifyPluginAsync } from 'fastify'
import { config } from '../config/env.js'
import { prisma } from '../lib/prisma.js'

export const whatsappRoutes: FastifyPluginAsync = async (fastify) => {
  // Webhook verification (GET)
  fastify.get('/webhook', async (request, reply) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = request.query as any

    if (mode === 'subscribe' && token === config.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      fastify.log.info('Webhook verified successfully')
      return reply.send(challenge)
    }

    return reply.status(403).send('Forbidden')
  })

  // Webhook endpoint (POST) - Receive status updates
  fastify.post('/webhook', async (request, reply) => {
    const body = request.body as any

    try {
      const statuses = body.entry?.[0]?.changes?.[0]?.value?.statuses || []

      for (const status of statuses) {
        const messageId = status.id
        const newStatus = status.status // 'sent' | 'delivered' | 'read' | 'failed'

        // Update message status in database
        await prisma.message.updateMany({
          where: { whatsappMessageId: messageId },
          data: {
            whatsappStatus: newStatus.toUpperCase(),
          },
        })

        fastify.log.info(`Updated message ${messageId} status to ${newStatus}`)
      }

      return reply.send({ success: true })
    } catch (error) {
      fastify.log.error({ error }, 'Webhook processing error')
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
}
