import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../shared/db/prisma";
import type { AuthUser } from "../../types/auth";
import { notify } from "../notifier/notifier.service";

export async function listComplaintMessagesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const complaintId = Number((request.params as { complaintId: string }).complaintId);
  const query = request.query as { limit?: string; cursor?: string };
  const limit = Math.min(Number(query.limit) || 50, 100);
  const cursor = query.cursor as string | undefined;

  // Load complaint to verify access
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    select: { id: true, residentId: true, condominiumId: true },
  });
  if (!complaint) {
    return reply.status(404).send({ error: "Ocorrência não encontrada" });
  }

  // Access check: residents may only see their own complaint messages
  if (user.role === "RESIDENT" && user.residentId !== complaint.residentId) {
    return reply.status(403).send({ error: "Acesso negado" });
  }

  // Resolve cursor to a createdAt timestamp for keyset pagination
  let cursorCreatedAt: Date | undefined;
  if (cursor) {
    const cursorRecord = await prisma.complaintMessage.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });
    cursorCreatedAt = cursorRecord?.createdAt;
  }

  const messages = await prisma.complaintMessage.findMany({
    where: {
      complaintId,
      ...(cursorCreatedAt ? { createdAt: { lt: cursorCreatedAt } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: { sender: { select: { id: true, name: true } } },
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  return reply.send({
    messages: items.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderRole: m.senderRole,
      senderName: m.sender.name,
      content: m.content,
      attachmentUrl: m.attachmentUrl,
      source: m.source,
      createdAt: m.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
  });
}

export async function sendComplaintMessageHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const complaintId = Number((request.params as { complaintId: string }).complaintId);
  const { content, attachmentUrl } = request.body as {
    content: string;
    attachmentUrl?: string;
  };

  if (!content?.trim()) {
    return reply.status(400).send({ error: "Conteúdo é obrigatório" });
  }

  // Load complaint to verify access and get context for notifications
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { resident: true, assignee: true },
  });
  if (!complaint) {
    return reply.status(404).send({ error: "Ocorrência não encontrada" });
  }

  if (user.role === "RESIDENT" && user.residentId !== complaint.residentId) {
    return reply.status(403).send({ error: "Acesso negado" });
  }

  const message = await prisma.complaintMessage.create({
    data: {
      complaintId,
      senderId: user.id,
      senderRole: user.role,
      content: content.trim(),
      attachmentUrl: attachmentUrl || null,
      source: "WEB",
    },
    include: { sender: { select: { id: true, name: true } } },
  });

  // Notify the other party (fire-and-forget)
  if (user.role === "RESIDENT") {
    // Notify assignee or syndic
    const targetId = complaint.assigneeId;
    if (targetId) {
      notify(
        prisma,
        request.log,
        {
          type: "complaint_comment",
          complaintId,
          recipientPhone: "",
          recipientName: complaint.assignee?.name ?? "Equipe",
          authorName: complaint.resident.name,
        },
        targetId,
        complaint.condominiumId
      ).catch(() => {});
    }
  } else {
    // Notify resident
    if (complaint.resident.userId) {
      notify(
        prisma,
        request.log,
        {
          type: "complaint_comment",
          complaintId,
          recipientPhone: complaint.resident.phone,
          recipientName: complaint.resident.name,
          authorName: user.name,
        },
        complaint.resident.userId,
        complaint.condominiumId
      ).catch(() => {});
    }
  }

  return reply.status(201).send({
    id: message.id,
    senderId: message.senderId,
    senderRole: message.senderRole,
    senderName: message.sender.name,
    content: message.content,
    attachmentUrl: message.attachmentUrl,
    source: message.source,
    createdAt: message.createdAt.toISOString(),
  });
}
