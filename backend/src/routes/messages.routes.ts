import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { messagingService } from "../services/messaging/index.js";

type ResidentData = {
  phone: string;
  name: string;
};

const sendMessageSchema = z.object({
  condominium_id: z.string(),
  type: z.enum(["TEXT", "TEMPLATE", "IMAGE"]),
  content: z.object({
    text: z.string(),
  }),
  target: z.object({
    scope: z.enum(["ALL", "TOWER", "FLOOR", "UNIT"]),
    tower: z.string().optional(),
    floor: z.string().optional(),
    unit: z.string().optional(),
  }),
  sentBy: z.string().optional(),
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
      const user = request.user as any;

    // Get targeted residents
    const residents = await prisma.resident.findMany({
      where: {
        condominiumId: body.condominium_id,
        consentWhatsapp: true,
          ...(body.target.scope === "TOWER" && { tower: body.target.tower }),
          ...(body.target.scope === "FLOOR" && {
          tower: body.target.tower,
          floor: body.target.floor,
        }),
          ...(body.target.scope === "UNIT" && {
          tower: body.target.tower,
          floor: body.target.floor,
          unit: body.target.unit,
        }),
      },
      });

    if (residents.length === 0) {
        return reply.status(400).send({ error: "No recipients found" });
    }

    // Send bulk messages via unified messaging service
    const result = await messagingService.sendBulk({
      recipients: residents.map((r: ResidentData) => ({
        phone: r.phone,
        name: r.name,
      })),
      message: body.content.text,
    });

    // Create message log
    const message = await prisma.message.create({
      data: {
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
      },
      });

    return reply.send({
      message,
      sendResult: result,
      });
}
  );
};
