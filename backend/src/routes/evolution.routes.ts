/**
 * Evolution API Routes
 * 
 * Rotas para gerenciar a instância da Evolution API
 * - Status da conexão
 * - QR Code para conexão
 * - Webhook para receber mensagens
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { evolutionService } from '../services/evolution/index.js';
import { prisma } from '../lib/prisma.js';
import type { WebhookPayload, MessageWebhookData } from '../services/evolution/types.js';

export const evolutionRoutes: FastifyPluginAsync = async (fastify) => {
  
  // =====================================================
  // Instance Management
  // =====================================================

  /**
   * GET /evolution/status
   * Retorna o status da conexão com WhatsApp
   */
  fastify.get(
    '/status',
    {
      onRequest: [fastify.authenticate],
    },
    async (_request, reply) => {
      try {
        const state = await evolutionService.getInstanceState();
        const isConnected = state.instance.state === 'open';

        return reply.send({
          connected: isConnected,
          state: state.instance.state,
          instanceName: state.instance.instanceName,
        });
      } catch (error: any) {
        return reply.status(500).send({
          connected: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * GET /evolution/qrcode
   * Retorna o QR Code para conexão (se não estiver conectado)
   */
  fastify.get(
    '/qrcode',
    {
      onRequest: [fastify.authenticate],
    },
    async (_request, reply) => {
      try {
        const qrcode = await evolutionService.getQRCode();
        
        return reply.send({
          qrcode: qrcode.base64,
          pairingCode: qrcode.pairingCode,
          count: qrcode.count,
        });
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message,
        });
      }
    }
  );

  /**
   * POST /evolution/disconnect
   * Desconecta a instância do WhatsApp
   */
  fastify.post(
    '/disconnect',
    {
      onRequest: [fastify.authenticate],
    },
    async (_request, reply) => {
      try {
        await evolutionService.disconnect();
        return reply.send({ message: 'Disconnected successfully' });
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  /**
   * POST /evolution/restart
   * Reinicia a instância
   */
  fastify.post(
    '/restart',
    {
      onRequest: [fastify.authenticate],
    },
    async (_request, reply) => {
      try {
        await evolutionService.restart();
        return reply.send({ message: 'Instance restarted' });
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  // =====================================================
  // Messaging
  // =====================================================

  const sendTextSchema = z.object({
    phone: z.string(),
    message: z.string(),
  });

  /**
   * POST /evolution/send
   * Envia uma mensagem de texto simples
   */
  fastify.post(
    '/send',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const body = sendTextSchema.parse(request.body);

      try {
        const result = await evolutionService.sendText({
          number: body.phone,
          text: body.message,
        });

        return reply.send({
          success: true,
          messageId: result.key.id,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  const checkNumbersSchema = z.object({
    numbers: z.array(z.string()),
  });

  /**
   * POST /evolution/check-numbers
   * Verifica se números estão no WhatsApp
   */
  fastify.post(
    '/check-numbers',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const body = checkNumbersSchema.parse(request.body);

      try {
        const results = await evolutionService.checkNumbers(body.numbers);

        return reply.send({
          results: results.map(r => ({
            number: r.number,
            onWhatsApp: r.onWhatsapp,
            jid: r.jid,
          })),
        });
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  // =====================================================
  // Webhook
  // =====================================================

  /**
   * POST /evolution/webhook
   * Recebe eventos da Evolution API (mensagens recebidas, status, etc.)
   */
  fastify.post(
    '/webhook',
    async (request, reply) => {
      const payload = request.body as WebhookPayload;

      fastify.log.info(`Evolution Webhook: ${payload.event}`);

      try {
        switch (payload.event) {
          case 'MESSAGES_UPSERT': {
            // Nova mensagem recebida
            const messageData = payload.data as MessageWebhookData;
            
            // Ignorar mensagens enviadas por nós
            if (messageData.key.fromMe) {
              break;
            }

            // Extrair texto da mensagem
            const text = messageData.message?.conversation 
              || messageData.message?.extendedTextMessage?.text
              || '';

            // Log da mensagem recebida
            fastify.log.info({
              from: messageData.key.remoteJid,
              pushName: messageData.pushName,
              text: text.substring(0, 100),
            }, 'Message received');

            // TODO: Processar mensagem recebida (auto-resposta, etc.)
            // Aqui você pode adicionar lógica para:
            // - Auto-respostas
            // - Encaminhar para atendimento
            // - Registrar em log
            // - Integrar com chatbot
            
            break;
          }

          case 'CONNECTION_UPDATE': {
            // Status de conexão alterado
            fastify.log.info({
              state: payload.data.state,
              instance: payload.instance,
            }, 'Connection status changed');
            break;
          }

          case 'QRCODE_UPDATED': {
            // Novo QR Code gerado
            fastify.log.info('New QR Code generated');
            break;
          }

          case 'SEND_MESSAGE': {
            // Mensagem enviada
            const sentData = payload.data;
            fastify.log.info({
              to: sentData.key?.remoteJid,
              status: sentData.status,
            }, 'Message sent');
            break;
          }

          case 'MESSAGES_UPDATE': {
            // Status da mensagem atualizado (entregue, lido)
            const updateData = payload.data;
            
            // Atualizar status da mensagem no banco se necessário
            if (updateData.update?.status) {
              const messageId = updateData.key?.id;
              const newStatus = updateData.update.status;
              
              fastify.log.info({
                messageId,
                status: newStatus,
              }, 'Message status updated');

              // TODO: Atualizar status no banco de dados
              // await prisma.message.update({
              //   where: { whatsappMessageId: messageId },
              //   data: { 
              //     whatsappStatus: mapStatus(newStatus) 
              //   },
              // });
            }
            break;
          }

          default:
            fastify.log.debug({ event: payload.event }, 'Unhandled webhook event');
        }

        return reply.send({ received: true });
      } catch (error: any) {
        fastify.log.error(error, 'Webhook processing error');
        return reply.status(500).send({ error: 'Webhook processing failed' });
      }
    }
  );
};

