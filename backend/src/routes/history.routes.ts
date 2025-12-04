import { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";

export const historyRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all history from ALL condominiums (SUPER_ADMIN only)
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;

      if (user.role !== "SUPER_ADMIN") {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Apenas SUPER_ADMIN pode ver todo o histórico.",
        });
      }

      const { condominiumId } = request.query as {
        condominiumId?: string;
      };

      const history = await prisma.complaintStatusHistory.findMany({
        where: {
          ...(condominiumId && {
            complaint: {
              condominiumId,
            },
          }),
        },
        include: {
          complaint: {
            include: {
              condominium: {
                select: {
                  id: true,
                  name: true,
                },
              },
              resident: {
                select: {
                  id: true,
                  name: true,
                  tower: true,
                  floor: true,
                  unit: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100, // Limit to last 100 entries
      });

      return reply.send(history);
    }
  );

  // Get history for a condominium
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { condominiumId } = request.params as { condominiumId: string };

      const history = await prisma.complaintStatusHistory.findMany({
        where: {
          complaint: {
            condominiumId,
          },
        },
        include: {
          complaint: {
            include: {
              resident: {
                select: {
                  id: true,
                  name: true,
                  tower: true,
                  floor: true,
                  unit: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100, // Limit to last 100 entries
      });

      return reply.send(history);
    }
  );
};
