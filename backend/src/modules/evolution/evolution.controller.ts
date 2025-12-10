import { FastifyReply, FastifyRequest } from "fastify";
import { evolutionService } from "./evolution.service";
import {
  checkNumbersSchema,
  sendTextSchema,
  type CheckNumbersSchema,
  type MessageWebhookData,
  type WebhookPayload,
  type SendTextSchema,
} from "./evolution.schema";

export async function getStatusHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const state = await evolutionService.getInstanceState();
    const isConnected = state.instance.state === "open";

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

export async function getQRCodeHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
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

export async function disconnectHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await evolutionService.disconnect();
    return reply.send({ message: "Disconnected successfully" });
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function restartHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await evolutionService.restart();
    return reply.send({ message: "Instance restarted" });
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function sendTextHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = sendTextSchema.parse(request.body) as SendTextSchema;

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

export async function checkNumbersHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = checkNumbersSchema.parse(request.body) as CheckNumbersSchema;

  try {
    const results = await evolutionService.checkNumbers(body.numbers);

    return reply.send({
      results: results.map((result) => ({
        number: result.number,
        onWhatsApp: result.onWhatsapp,
        jid: result.jid,
      })),
    });
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
}

export async function webhookHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const payload = request.body as WebhookPayload;

  request.log.info(`Evolution Webhook: ${payload.event}`);

  try {
    switch (payload.event) {
      case "MESSAGES_UPSERT": {
        const messageData = payload.data as MessageWebhookData;

        if (messageData.key.fromMe) {
          break;
        }

        const text =
          messageData.message?.conversation ||
          messageData.message?.extendedTextMessage?.text ||
          "";

        request.log.info(
          {
            from: messageData.key.remoteJid,
            pushName: messageData.pushName,
            text: text.substring(0, 100),
          },
          "Message received"
        );

        break;
      }

      case "CONNECTION_UPDATE": {
        request.log.info(
          {
            state: (payload.data as { state?: string }).state,
            instance: payload.instance,
          },
          "Connection status changed"
        );
        break;
      }

      case "QRCODE_UPDATED": {
        request.log.info("New QR Code generated");
        break;
      }

      case "SEND_MESSAGE": {
        const sentData = payload.data as {
          key?: { remoteJid?: string };
          status?: string;
        };
        request.log.info(
          {
            to: sentData.key?.remoteJid,
            status: sentData.status,
          },
          "Message sent"
        );
        break;
      }

      case "MESSAGES_UPDATE": {
        const updateData = payload.data as {
          update?: { status?: string };
          key?: { id?: string };
        };

        if (updateData.update?.status) {
          const messageId = updateData.key?.id;
          const newStatus = updateData.update.status;

          request.log.info(
            {
              messageId,
              status: newStatus,
            },
            "Message status updated"
          );
        }
        break;
      }

      default:
        request.log.debug({ event: payload.event }, "Unhandled webhook event");
    }

    return reply.send({ received: true });
  } catch (error: any) {
    request.log.error(error, "Webhook processing error");
    return reply.status(500).send({ error: "Webhook processing failed" });
  }
}
