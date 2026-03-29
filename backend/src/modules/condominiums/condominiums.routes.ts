import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin, requireSyndicStrict } from "../../shared/middlewares";
import { requireAdmin, requireCondoAccess } from "../../auth/authorize";
import { prisma } from "../../shared/db/prisma";
import {
  listCondominiumsHandler,
  getCondominiumHandler,
  createCondominiumHandler,
  updateCondominiumHandler,
  deleteCondominiumHandler,
  getCondominiumStatsHandler,
  updateCondominiumSettingsHandler,
  getOnboardingHandler,
} from "./condominiums.controller";
import { getAnnouncementsByCondominiumHandler } from "../announcements";

export const condominiumsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    listCondominiumsHandler
  );

  fastify.get(
    "/:id/announcements",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "id" }),
      ],
    },
    getAnnouncementsByCondominiumHandler
  );

  fastify.get(
    "/:id",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "id" }),
      ],
    },
    getCondominiumHandler
  );

  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    createCondominiumHandler
  );

  fastify.patch(
    "/:id",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    updateCondominiumHandler
  );

  fastify.patch(
    "/:id/settings",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "id" }),
        requireSyndicStrict(),
      ],
    },
    updateCondominiumSettingsHandler
  );

  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    deleteCondominiumHandler
  );

  fastify.get(
    "/:id/stats",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "id" }),
      ],
    },
    getCondominiumStatsHandler
  );

  fastify.get(
    "/:id/onboarding",
    {
      onRequest: [
        fastify.authenticate,
        requireAdmin(),
        requireCondoAccess({ paramName: "id" }),
      ],
    },
    getOnboardingHandler
  );

  fastify.get(
    "/:id/syndic-profile",
    { onRequest: [fastify.authenticate, requireCondoAccess({ paramName: "id" })] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const syndicLink = await prisma.userCondominium.findFirst({
        where: {
          condominiumId: id,
          role: { in: ["SYNDIC", "PROFESSIONAL_SYNDIC"] },
        },
        include: {
          user: {
            select: {
              name: true,
              contactPhone: true,
              photoUrl: true,
              officeHours: true,
              publicNotes: true,
            },
          },
        },
      });

      if (!syndicLink) {
        return reply.code(404).send({ error: "Síndico não encontrado para este condomínio" });
      }

      return reply.send(syndicLink.user);
    }
  );
};
