import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { resolveAccessContext, isCondominiumAllowed } from "../../auth/context";
import type { AuthUser } from "../../types/auth";
import { sendBulkAndRecordMessages } from "../whatsapp/whatsapp.service";

// =====================================================
// GET /api/announcements/:condominiumId
// =====================================================

interface ListQuery {
  active?: string;
  limit?: string;
  cursor?: string;
}

export async function listAnnouncementsHandler(
  request: FastifyRequest<{ Params: { condominiumId: string }; Querystring: ListQuery }>,
  reply: FastifyReply
) {
  const { condominiumId } = request.params;
  const { active: activeParam, limit: limitParam, cursor } = request.query;

  const activeOnly = activeParam === "true";
  const limit = Math.min(100, Math.max(1, Number(limitParam) || 20));

  const now = new Date();

  const where: any = { condominiumId };

  if (activeOnly) {
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
  }

  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const rows = await prisma.announcement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      author: { select: { name: true } },
    },
  });

  let nextCursor: string | null = null;
  if (rows.length > limit) {
    const last = rows[limit - 1];
    nextCursor = last.createdAt.toISOString();
    rows.splice(limit);
  }

  const announcements = rows.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    imageUrl: a.imageUrl,
    scope: a.scope,
    targetTower: a.targetTower,
    targetFloor: a.targetFloor,
    targetUnit: a.targetUnit,
    sendWhatsApp: a.sendWhatsApp,
    createdBy: a.createdBy,
    authorName: a.author?.name ?? null,
    createdAt: a.createdAt.toISOString(),
    expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
  }));

  return reply.send({ announcements, nextCursor });
}

// =====================================================
// POST /api/announcements/
// =====================================================

interface CreateBody {
  condominiumId: string;
  title: string;
  content: string;
  scope?: "ALL" | "TOWER" | "FLOOR" | "UNIT";
  targetTower?: string;
  targetFloor?: string;
  targetUnit?: string;
  sendWhatsApp?: boolean;
  expiresAt?: string;
}

export async function createAnnouncementHandler(
  request: FastifyRequest<{ Body: CreateBody }>,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const data = request.body;

  // Validate required fields
  if (!data.condominiumId) {
    return reply.status(400).send({ error: "condominiumId é obrigatório" });
  }

  // Verify the requesting syndic is actually allowed to act on this condominium
  const context = await resolveAccessContext(prisma, {
    id: user.id,
    role: user.role,
    permissionScope: user.permissionScope as any,
  });
  if (!isCondominiumAllowed(context, data.condominiumId)) {
    return reply.status(403).send({ error: "Acesso negado a este condomínio" });
  }

  if (!data.title || data.title.length < 3) {
    return reply.status(400).send({ error: "title deve ter no mínimo 3 caracteres" });
  }
  if (!data.content || data.content.length < 10) {
    return reply.status(400).send({ error: "content deve ter no mínimo 10 caracteres" });
  }

  const scope = data.scope ?? "ALL";
  const sendWhatsApp = data.sendWhatsApp ?? false;
  const now = new Date();

  const announcement = await prisma.announcement.create({
    data: {
      condominiumId: data.condominiumId,
      title: data.title,
      content: data.content,
      scope,
      targetTower: data.targetTower ?? null,
      targetFloor: data.targetFloor ?? null,
      targetUnit: data.targetUnit ?? null,
      sendWhatsApp,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdBy: user.id,
      // startsAt and endsAt are required by the model — set to now / far future
      startsAt: now,
      endsAt: data.expiresAt ? new Date(data.expiresAt) : new Date("2099-12-31T23:59:59Z"),
    },
    include: {
      author: { select: { name: true } },
    },
  });

  if (sendWhatsApp) {
    try {
      const residentFilter: any = { condominiumId: data.condominiumId, consentWhatsapp: true };
      if (scope === "TOWER") {
        residentFilter.tower = data.targetTower;
      } else if (scope === "FLOOR") {
        residentFilter.tower = data.targetTower;
        residentFilter.floor = data.targetFloor;
      } else if (scope === "UNIT") {
        residentFilter.tower = data.targetTower;
        residentFilter.floor = data.targetFloor;
        residentFilter.unit = data.targetUnit;
      }

      const residents = await prisma.resident.findMany({
        where: residentFilter,
        select: { phone: true, name: true },
      });

      if (residents.length > 0) {
        await sendBulkAndRecordMessages(
          prisma,
          request.log,
          {
            condominiumId: data.condominiumId,
            message: `📢 ${data.title}\n\n${data.content}`,
            recipients: residents.map((r) => ({ phone: r.phone, name: r.name })),
          },
          user.id
        );
      }
    } catch (err) {
      request.log.error({ err }, "WhatsApp dispatch failed for announcement");
    }
  }

  return reply.status(201).send({
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    imageUrl: announcement.imageUrl,
    scope: announcement.scope,
    targetTower: announcement.targetTower,
    targetFloor: announcement.targetFloor,
    targetUnit: announcement.targetUnit,
    sendWhatsApp: announcement.sendWhatsApp,
    createdBy: announcement.createdBy,
    authorName: announcement.author?.name ?? null,
    createdAt: announcement.createdAt.toISOString(),
    expiresAt: announcement.expiresAt ? announcement.expiresAt.toISOString() : null,
  });
}

// =====================================================
// DELETE /api/announcements/:id
// =====================================================

export async function deleteAnnouncementHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const { id } = request.params;

  const announcement = await prisma.announcement.findUnique({ where: { id } });

  if (!announcement) {
    return reply.status(404).send({ error: "Comunicado não encontrado" });
  }

  const context = await resolveAccessContext(prisma, {
    id: user.id,
    role: user.role,
    permissionScope: user.permissionScope as any,
  });

  if (!isCondominiumAllowed(context, announcement.condominiumId)) {
    return reply.status(403).send({ error: "Acesso negado ao condomínio do comunicado" });
  }

  await prisma.announcement.delete({ where: { id } });

  return reply.send({ success: true });
}
