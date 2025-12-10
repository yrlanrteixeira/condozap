import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma";
import { messagingService } from "../messaging";
import {
  findMessages,
  findTargetResidents,
  createMessageLog,
} from "./messages.db";
import {
  messagesParamsSchema,
  messagesQuerySchema,
  sendMessageSchema,
} from "./messages.schemas";
import type {
  MessagesParams,
  MessagesQuery,
  SendMessageBody,
} from "./messages.types";

export const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { condominiumId } = messagesParamsSchema.parse(
        request.params
      ) as MessagesParams;
      const { limit = 50 } = messagesQuerySchema.parse(
        request.query
      ) as MessagesQuery;

      const messages = await findMessages(prisma, condominiumId, Number(limit));

      return reply.send(messages);
    }
  );

  fastify.post(
    "/send",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const body = sendMessageSchema.parse(request.body) as SendMessageBody;
      const user = request.user as { id: string };

      const residents = await findTargetResidents(prisma, {
        condominiumId: body.condominium_id,
        scope: body.target.scope,
        tower: body.target.tower,
        floor: body.target.floor,
        unit: body.target.unit,
      });

      if (residents.length === 0) {
        return reply.status(400).send({ error: "No recipients found" });
      }

      const result = await messagingService.sendBulk({
        recipients: residents.map((resident) => ({
          phone: resident.phone,
          name: resident.name,
        })),
        message: body.content.text,
      });

      const message = await createMessageLog(prisma, {
        condominiumId: body.condominium_id,
        type: body.type,
        scope: body.target.scope,
        targetTower: body.target.tower,
        targetFloor: body.target.floor,
        targetUnit: body.target.unit,
        content: body.content.text,
        recipientCount: result.total,
        sentBy: body.sentBy || user.id,
        whatsappStatus: result.sent > 0 ? "SENT" : "FAILED",
      });

      return reply.send({
        message,
        sendResult: result,
      });
    }
  );
};
