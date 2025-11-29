import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const createResidentSchema = z.object({
  condominiumId: z.string(),
  name: z.string().min(3),
  phone: z.string().regex(/^55\d{10,11}$/),
  tower: z.string(),
  floor: z.string(),
  unit: z.string(),
  type: z.enum(["OWNER", "TENANT"]).optional(),
});

export const residentsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all residents
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { condominiumId } = request.params as { condominiumId: string };
      const { tower, floor, type, search } = request.query as any;

      const residents = await prisma.resident.findMany({
        where: {
          condominiumId,
          ...(tower && { tower }),
          ...(floor && { floor }),
          ...(type && { type }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }),
        },
        orderBy: [{ tower: "asc" }, { floor: "asc" }, { unit: "asc" }],
      });

      return reply.send(residents);
    }
  );

  // Create resident
  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const body = createResidentSchema.parse(request.body);

      const resident = await prisma.resident.create({
        data: {
          ...body,
          type: body.type || "OWNER",
        },
      });

      return reply.status(201).send(resident);
    }
  );

  // Update resident
  fastify.patch(
    "/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Partial<typeof createResidentSchema._type>;

      const resident = await prisma.resident.update({
        where: { id },
        data: body,
      });

      return reply.send(resident);
    }
  );

  // Delete resident
  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      await prisma.resident.delete({
        where: { id },
      });

      return reply.status(204).send();
    }
  );
};
