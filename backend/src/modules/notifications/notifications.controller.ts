import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import type { AuthUser } from "../../types/auth";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

// GET /
export async function listNotificationsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;

  const query = request.query as {
    unreadOnly?: string;
    limit?: string;
    cursor?: string;
  };

  const unreadOnly = query.unreadOnly === "true";
  const rawLimit = parseInt(query.limit ?? String(DEFAULT_LIMIT), 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? DEFAULT_LIMIT : Math.min(rawLimit, MAX_LIMIT);
  const cursor = query.cursor;

  const where: Record<string, unknown> = { userId: user.id };

  if (unreadOnly) {
    where.read = false;
  }

  // Cursor-based pagination: find notifications older than the cursor item
  if (cursor) {
    const cursorItem = await prisma.notification.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });

    if (cursorItem) {
      where.createdAt = { lt: cursorItem.createdAt };
    }
  }

  // Fetch limit+1 to determine if there are more pages
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return reply.send({
    notifications: items,
    nextCursor,
    unreadCount,
  });
}

// GET /unread-count
export async function getUnreadCountHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return reply.send({ unreadCount });
}

// PATCH /:id/read
export async function markAsReadHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const { id } = request.params as { id: string };

  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!notification) {
    return reply.status(404).send({ error: "Notificação não encontrada" });
  }

  if (notification.userId !== user.id) {
    return reply.status(403).send({ error: "Acesso negado" });
  }

  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return reply.send({ success: true });
}

// PATCH /read-all
export async function markAllAsReadHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;

  const result = await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  return reply.send({ updated: result.count });
}
