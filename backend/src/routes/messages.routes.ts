import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { whatsappService } from "../services/whatsapp.service.js";

type ResidentData = {
  phone: string;
  name: string;
};

const sendMessageSchema = z.object({
  condominiumId: z.string(),
  type: z.enum(["TEXT", "TEMPLATE", "IMAGE"]),
  scope: z.enum(["ALL", "TOWER", "FLOOR", "UNIT"]),
  targetTower: z.string().optional(),
  targetFloor: z.string().optional(),
  targetUnit: z.string().optional(),
  content: z.string(),
  sentBy: z.string(),
});

export const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  // Get messages history
  fastify.get(
    "/:condominiumId",
    {
    onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { condominiumId } = request.params as { condominiumId: string };
      const { limit = 50 } = request.query as any;

    const messages = await prisma.message.findMany({
      where: { condominiumId },
        orderBy: { sentAt: "desc" },
      take: parseInt(limit),
      });

      return reply.send(messages);
    }
  );

  // Send message
  fastify.post(
    "/send",
    {
    onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const body = sendMessageSchema.parse(request.body);

    // Get targeted residents
    const residents = await prisma.resident.findMany({
      where: {
        condominiumId: body.condominiumId,
        consentWhatsapp: true,
          ...(body.scope === "TOWER" && { tower: body.targetTower }),
          ...(body.scope === "FLOOR" && {
          tower: body.targetTower,
          floor: body.targetFloor,
        }),
          ...(body.scope === "UNIT" && {
          tower: body.targetTower,
          floor: body.targetFloor,
          unit: body.targetUnit,
        }),
      },
      });

    if (residents.length === 0) {
        return reply.status(400).send({ error: "No recipients found" });
    }

    // Send bulk messages
    const result = await whatsappService.sendBulkMessages({
        recipients: residents.map((r: ResidentData) => ({
          phone: r.phone,
          name: r.name,
        })),
      message: body.content,
      });

    // Create message log
    const message = await prisma.message.create({
      data: {
        condominiumId: body.condominiumId,
        type: body.type,
        scope: body.scope,
        targetTower: body.targetTower,
        targetFloor: body.targetFloor,
        targetUnit: body.targetUnit,
        content: body.content,
        recipientCount: result.total,
        sentBy: body.sentBy,
          whatsappStatus: result.sent > 0 ? "SENT" : "FAILED",
      },
      });

    return reply.send({
      message,
      sendResult: result,
      });
}
  );
};
