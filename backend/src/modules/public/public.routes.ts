import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { normalizeCondominiumSlug } from "../../shared/utils/condominium-slug";

/**
 * Endpoints públicos (sem autenticação), ex.: pré-visualização do condomínio no cadastro.
 */
export const publicRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/condominiums/:slug", async (request, reply) => {
    const { slug: raw } = request.params as { slug: string };
    const slug = normalizeCondominiumSlug(raw);
    if (!slug) {
      return reply.status(404).send({ error: "Condomínio não encontrado" });
    }

    const condo = await prisma.condominium.findUnique({
      where: { slug },
      select: {
        slug: true,
        name: true,
        status: true,
      },
    });

    if (!condo) {
      return reply.status(404).send({ error: "Condomínio não encontrado" });
    }

    const registrationOpen = condo.status !== "SUSPENDED";

    return reply.send({
      slug: condo.slug,
      name: condo.name,
      status: condo.status,
      registrationOpen,
    });
  });
};
