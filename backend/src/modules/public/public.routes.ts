import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { normalizeCondominiumSlug } from "../../shared/utils/condominium-slug";
import { hashInviteToken } from "../../shared/utils/invite-token";

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
        id: true,
        slug: true,
        name: true,
        status: true,
        structure: true,
      },
    });

    if (!condo) {
      return reply.status(404).send({ error: "Condomínio não encontrado" });
    }

    const registrationOpen = condo.status !== "SUSPENDED";

    return reply.send({
      id: condo.id,
      slug: condo.slug,
      name: condo.name,
      status: condo.status,
      registrationOpen,
      structure: condo.structure ?? null,
    });
  });

  /** Valida token de convite do síndico (query ?invite= na tela de registro). */
  fastify.get("/register-invites/:token", async (request, reply) => {
    const { token: raw } = request.params as { token: string };
    if (!raw?.trim()) {
      return reply.status(400).send({ error: "Token ausente" });
    }
    const tokenHash = hashInviteToken(raw.trim());
    const invite = await prisma.residentInvite.findUnique({
      where: { tokenHash },
      include: {
        condominium: { select: { slug: true, name: true, status: true } },
      },
    });

    if (!invite) {
      return reply.status(404).send({ error: "Convite não encontrado" });
    }
    if (invite.consumedAt) {
      return reply.status(410).send({ error: "Este convite já foi utilizado" });
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      return reply.status(410).send({ error: "Este convite expirou" });
    }

    const registrationOpen = invite.condominium.status !== "SUSPENDED";

    return reply.send({
      condominiumId: invite.condominiumId,
      condominiumSlug: invite.condominium.slug,
      condominiumName: invite.condominium.name,
      name: invite.name,
      phone: invite.phone,
      tower: invite.tower,
      floor: invite.floor,
      unit: invite.unit,
      registrationOpen,
    });
  });
};
