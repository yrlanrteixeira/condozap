import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../shared/db/prisma";
import type { AuthUser } from "../../types/auth";
import { notify } from "../notifier/notifier.service";
import { resolveAccessContext, isCondominiumAllowed } from "../../auth/context";
import { sendSSENotification, subscribeToChannel } from "../../plugins/sse";

export async function sseComplaintMessagesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const complaintId = Number((request.params as { complaintId: string }).complaintId);
  if (!Number.isInteger(complaintId) || complaintId <= 0) {
    return reply.status(400).send({ error: "ID da ocorrência inválido" });
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    select: { id: true, residentId: true, condominiumId: true },
  });
  if (!complaint) {
    return reply.status(404).send({ error: "Ocorrência não encontrada" });
  }

  if (user.role === "RESIDENT" && user.residentId !== complaint.residentId) {
    return reply.status(403).send({ error: "Acesso negado" });
  }

  if (user.role !== "RESIDENT") {
    const context = await resolveAccessContext(prisma, user);
    if (!isCondominiumAllowed(context, complaint.condominiumId)) {
      return reply.status(403).send({ error: "Acesso negado a este condomínio" });
    }
  }

  reply.hijack();

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  reply.raw.write(
    `event: connected\ndata: ${JSON.stringify({ complaintId })}\n\n`
  );

  // Subscribe this raw stream to the per-complaint channel.
  // Pushes happen from sendComplaintMessageHandler via sendSSENotification
  // -> broadcastToChannel, eliminating the previous 3s polling loop.
  const unsubscribe = subscribeToChannel(`complaint:${complaintId}`, reply.raw);

  let closed = false;
  const heartbeat = setInterval(() => {
    if (closed) return;
    try {
      reply.raw.write(`: heartbeat\n\n`);
    } catch {
      // socket already closed; cleanup handled by 'close' event
    }
  }, 25000);

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
  };

  request.raw.on("close", cleanup);
  request.raw.on("error", cleanup);
}

export async function listComplaintMessagesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const complaintId = Number((request.params as { complaintId: string }).complaintId);
  if (!Number.isInteger(complaintId) || complaintId <= 0) {
    return reply.status(400).send({ error: "ID da ocorrência inválido" });
  }
  const query = request.query as { limit?: string; cursor?: string };
  const limit = Math.min(Number(query.limit) || 50, 100);
  const cursor = query.cursor as string | undefined;

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    select: { id: true, residentId: true, condominiumId: true },
  });
  if (!complaint) {
    return reply.status(404).send({ error: "Ocorrência não encontrada" });
  }

  if (user.role === "RESIDENT" && user.residentId !== complaint.residentId) {
    return reply.status(403).send({ error: "Acesso negado" });
  }

  if (user.role !== "RESIDENT") {
    const context = await resolveAccessContext(prisma, user);
    if (!isCondominiumAllowed(context, complaint.condominiumId)) {
      return reply.status(403).send({ error: "Acesso negado a este condomínio" });
    }
  }

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
      ...(user.role === "RESIDENT" ? { isInternal: false } : {}),
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
      isInternal: m.isInternal,
      whatsappStatus: m.whatsappStatus,
      whatsappMessageId: m.whatsappMessageId,
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
  if (!Number.isInteger(complaintId) || complaintId <= 0) {
    return reply.status(400).send({ error: "ID da ocorrência inválido" });
  }
  const { content, attachmentUrl, isInternal, notifyWhatsapp = true } = request.body as {
    content: string;
    attachmentUrl?: string;
    isInternal?: boolean;
    notifyWhatsapp?: boolean;
  };

  if (!content?.trim()) {
    return reply.status(400).send({ error: "Conteúdo é obrigatório" });
  }

  const isInternalMessage = isInternal && user.role !== "RESIDENT";

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { resident: true, assignee: true, sector: true },
  });
  if (!complaint) {
    return reply.status(404).send({ error: "Ocorrência não encontrada" });
  }

  if (user.role === "RESIDENT" && user.residentId !== complaint.residentId) {
    return reply.status(403).send({ error: "Acesso negado" });
  }

  if (user.role !== "RESIDENT") {
    const context = await resolveAccessContext(prisma, user);
    if (!isCondominiumAllowed(context, complaint.condominiumId)) {
      return reply.status(403).send({ error: "Acesso negado a este condomínio" });
    }
  }

  const message = await prisma.complaintMessage.create({
    data: {
      complaintId,
      senderId: user.id,
      senderRole: user.role,
      content: content.trim(),
      attachmentUrl: attachmentUrl || null,
      source: "WEB",
      isInternal: isInternalMessage,
    },
    include: { sender: { select: { id: true, name: true } } },
  });

  const logNotifyError = (target: string) => (err: unknown) => {
    request.log.error({ err, complaintId, target }, "complaint chat notify failed");
  };

  if (user.role === "RESIDENT") {
    if (complaint.assigneeId) {
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
        complaint.assigneeId,
        complaint.condominiumId
      ).catch(logNotifyError("assignee"));
    }

    if (complaint.sectorId) {
      const sectorMembers = await prisma.sectorMember.findMany({
        where: {
          sectorId: complaint.sectorId,
          isActive: true,
        },
        select: { userId: true },
      });

      for (const member of sectorMembers) {
        if (member.userId !== complaint.assigneeId) {
          notify(
            prisma,
            request.log,
            {
              type: "complaint_comment",
              complaintId,
              recipientPhone: "",
              recipientName: "Setor",
              authorName: complaint.resident.name,
            },
            member.userId,
            complaint.condominiumId
          ).catch(logNotifyError(`sector_member:${member.userId}`));
        }
      }
    }
  } else {
    if (!isInternalMessage && notifyWhatsapp && complaint.resident.userId) {
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
      ).catch(logNotifyError("resident"));
    }
  }

  const response = {
    id: message.id,
    senderId: message.senderId,
    senderRole: message.senderRole,
    senderName: message.sender.name,
    content: message.content,
    attachmentUrl: message.attachmentUrl,
    source: message.source,
    isInternal: message.isInternal,
    whatsappStatus: message.whatsappStatus,
    whatsappMessageId: message.whatsappMessageId,
    createdAt: message.createdAt.toISOString(),
  };

  // Broadcast to SSE stream for this complaint
  sendSSENotification(
    `complaint:${complaintId}`,
    "new_message",
    response
  );

  return reply.status(201).send(response);
}