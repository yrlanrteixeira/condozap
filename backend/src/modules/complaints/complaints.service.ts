import {
  PrismaClient,
  ComplaintStatus,
  ComplaintPriority,
} from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { whatsappService } from "../whatsapp/whatsapp.service";
import {
  buildComplaintCreatedMessage,
  buildComplaintStatusMessage,
  buildComplaintPriorityMessage,
  buildComplaintCommentMessage,
} from "../../shared/utils/notifications";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import type {
  AddComplaintAttachmentRequest,
  AddComplaintCommentRequest,
  AssignComplaintRequest,
  CreateComplaintRequest,
  PauseComplaintSlaRequest,
  ResumeComplaintSlaRequest,
  UpdateComplaintPriorityRequest,
  UpdateComplaintStatusRequest,
} from "./complaints.schema";
import { assertValidTransition, SLA_ACTIONS } from "./complaints.transitions";
import { findSlaConfig, resolveAssignee, addMinutes, runSlaEscalationScan } from "./complaints.sla";

export { runSlaEscalationScan };

export async function createComplaint(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateComplaintRequest
) {
  const resident = await findResidentById(prisma, data.residentId);
  if (!resident) {
    throw new NotFoundError("Resident");
  }

  const now = new Date();
  const slaConfig = await findSlaConfig(
    prisma,
    data.condominiumId,
    (data.priority as ComplaintPriority) || "MEDIUM"
  );

  const responseDueAt = addMinutes(now, slaConfig.responseMinutes);
  const resolutionDueAt = addMinutes(now, slaConfig.resolutionMinutes);

  const complaint = await prisma.complaint.create({
    data: {
      condominiumId: data.condominiumId,
      residentId: data.residentId,
      category: data.category,
      content: data.content,
      priority: (data.priority as ComplaintPriority) || "MEDIUM",
      isAnonymous: data.isAnonymous ?? false,
      status: ComplaintStatus.NEW,
      sectorId: data.sectorId ?? null,
      responseDueAt,
      resolutionDueAt,
    },
    include: {
      resident: true,
      attachments: true,
      sector: true,
      assignee: true,
    },
  });

  let effectiveSectorId = data.sectorId ?? null;

  // Auto-triage: find sector by category (e.g. "Manutenção" → setor Manutenção)
  if (!effectiveSectorId && data.category) {
    const sectorByCategory = await prisma.sector.findFirst({
      where: {
        condominiumId: data.condominiumId,
        categories: { has: data.category.trim() },
      },
    });
    if (sectorByCategory) {
      effectiveSectorId = sectorByCategory.id;
      await prisma.complaint.update({
        where: { id: complaint.id },
        data: {
          sectorId: effectiveSectorId,
          status: ComplaintStatus.TRIAGE,
        },
      });
      await prisma.complaintStatusHistory.create({
        data: {
          complaintId: complaint.id,
          fromStatus: ComplaintStatus.NEW,
          toStatus: ComplaintStatus.TRIAGE,
          changedBy: "system",
          notes: "Triagem automática por categoria",
          action: SLA_ACTIONS.STATUS_CHANGE,
          metadata: { sectorId: effectiveSectorId, category: data.category },
        },
      });
      logger.info(
        { complaintId: complaint.id, sectorId: effectiveSectorId, category: data.category },
        "Auto-triage: complaint assigned to sector by category"
      );
    }
  }

  // Só faz assign (IN_PROGRESS + assignee) quando o setor foi informado na criação.
  // Em auto-triage mantemos TRIAGE para o residente ver "em triagem" e o setor já definido.
  if (data.sectorId) {
    await assignComplaint(
      prisma,
      logger,
      complaint.id,
      {
        sectorId: effectiveSectorId!,
        assigneeId: undefined,
        reason: "Auto-assignment on creation",
      },
      true
    );
  }

  if (resident.consentWhatsapp && !data.isAnonymous) {
    const message = buildComplaintCreatedMessage(
      resident.name,
      complaint.id,
      data.category,
      complaint.priority
    );
    whatsappService
      .sendTextMessage(resident.phone, message)
      .catch((error: unknown) => {
        logger.error({ error }, "Failed to send WhatsApp notification");
      });
  }

  logger.info(`Complaint ${complaint.id} created`);

  // Retorna o complaint atualizado (pode ter sectorId e TRIAGE após auto-triage)
  const final = await prisma.complaint.findUnique({
    where: { id: complaint.id },
    include: {
      resident: true,
      attachments: true,
      sector: true,
      assignee: true,
    },
  });
  return final ?? complaint;
}

export async function updateComplaintStatus(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: number,
  data: UpdateComplaintStatusRequest,
  userId: string
) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: { resident: true },
  });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }
  const now = new Date();
  const nextStatus = data.status as ComplaintStatus;
  assertValidTransition(complaint.status, nextStatus);
  const updated = await prisma.complaint.update({
    where: { id },
    data: {
      status: nextStatus,
      ...(nextStatus === ComplaintStatus.RESOLVED && {
        resolvedAt: now,
        resolvedBy: userId,
      }),
      ...(nextStatus === ComplaintStatus.CLOSED &&
        !complaint.resolvedAt && {
          resolvedAt: now,
          resolvedBy: userId,
        }),
      ...(nextStatus === ComplaintStatus.IN_PROGRESS && {
        responseAt: complaint.responseAt ?? now,
        pausedUntil: null,
        pauseReason: null,
      }),
      ...(nextStatus === ComplaintStatus.CANCELLED && {
        pausedUntil: null,
        pauseReason: null,
      }),
    },
    include: {
      resident: true,
      statusHistory: true,
    },
  });
  await prisma.complaintStatusHistory.create({
    data: {
      complaintId: id,
      fromStatus: complaint.status,
      toStatus: data.status as ComplaintStatus,
      changedBy: userId,
      notes: data.notes,
      action: SLA_ACTIONS.STATUS_CHANGE,
      metadata: { reason: data.notes },
    },
  });

  if (complaint.resident.consentWhatsapp) {
    const message = buildComplaintStatusMessage(
      complaint.resident.name,
      complaint.id,
      complaint.category,
      data.status,
      data.notes
    );
    whatsappService
      .sendTextMessage(complaint.resident.phone, message)
      .catch((error: unknown) => {
        logger.error({ error }, "Failed to send WhatsApp notification");
      });
  }

  logger.info(`Complaint ${id} status updated to ${data.status}`);

  return updated;
}

export async function updateComplaintPriority(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: number,
  data: UpdateComplaintPriorityRequest
) {
  const complaint = await prisma.complaint.update({
    where: { id },
    data: { priority: data.priority },
    include: { resident: true },
  });

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  if (complaint.resident.consentWhatsapp) {
    const message = buildComplaintPriorityMessage(
      complaint.resident.name,
      complaint.id,
      data.priority
    );
    whatsappService
      .sendTextMessage(complaint.resident.phone, message)
      .catch((error: unknown) => {
        logger.error({ error }, "Failed to send WhatsApp notification");
      });
  }

  logger.info(`Complaint ${id} priority updated to ${data.priority}`);

  return complaint;
}

export async function addComplaintComment(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: number,
  data: AddComplaintCommentRequest,
  userId: string,
  userRole: string
) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: { resident: true },
  });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  const historyEntry = await prisma.complaintStatusHistory.create({
    data: {
      complaintId: id,
      fromStatus: complaint.status,
      toStatus: complaint.status,
      changedBy: userId,
      notes: data.notes,
      action: SLA_ACTIONS.COMMENT,
    },
  });

  await prisma.complaint.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  if (complaint.resident.consentWhatsapp) {
    const message = buildComplaintCommentMessage(
      complaint.resident.name,
      complaint.id,
      userRole,
      data.notes
    );
    whatsappService
      .sendTextMessage(complaint.resident.phone, message)
      .catch((error: unknown) => {
        logger.error({ error }, "Failed to send WhatsApp notification");
      });
  }

  logger.info(`Comment added to complaint ${id}`);

  return historyEntry;
}

export async function updateComplaint(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: number,
  data: {
    status?: string;
    priority?: string;
    category?: string;
    content?: string;
    resolvedBy?: string;
  },
  userId: string
) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: { resident: true },
  });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  const updateData: Record<string, unknown> = {};
  if (data.category !== undefined) updateData.category = data.category;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.resolvedBy !== undefined) updateData.resolvedBy = data.resolvedBy;

  if (data.priority !== undefined) {
    updateData.priority = data.priority as ComplaintPriority;
  }

  if (data.status !== undefined) {
    const nextStatus = data.status as ComplaintStatus;
    assertValidTransition(complaint.status, nextStatus);
    updateData.status = nextStatus;

    if (nextStatus === ComplaintStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = data.resolvedBy || userId;
    }
  }

  const updated = await prisma.complaint.update({
    where: { id },
    data: updateData,
    include: {
      resident: true,
      attachments: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
      sector: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  if (data.status && data.status !== complaint.status) {
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId: id,
        fromStatus: complaint.status,
        toStatus: data.status as ComplaintStatus,
        changedBy: userId,
        action: SLA_ACTIONS.STATUS_CHANGE,
      },
    });
  }

  logger.info(`Complaint ${id} updated`);
  return updated;
}

export async function getComplaintStats(
  prisma: PrismaClient,
  condominiumId?: string
) {
  const where = condominiumId ? { condominiumId } : {};

  const [total, byStatus, byPriority] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
    }),
    prisma.complaint.groupBy({
      by: ["priority"],
      where,
      _count: { id: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(
    byStatus.map((s) => [s.status, s._count.id])
  );
  const priorityCounts = Object.fromEntries(
    byPriority.map((p) => [p.priority, p._count.id])
  );

  return {
    total,
    byStatus: statusCounts,
    byPriority: priorityCounts,
  };
}

export async function deleteComplaint(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: number
) {
  await prisma.complaint.delete({
    where: { id },
  });
  logger.info(`Complaint ${id} deleted`);
}

export async function getComplaintById(prisma: PrismaClient, id: number) {
  return prisma.complaint.findUnique({
    where: { id },
    include: {
      resident: true,
      attachments: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
      sector: true,
      assignee: true,
      assignments: {
        orderBy: { createdAt: "desc" },
        include: {
          assignee: true,
          assignedByUser: true,
          sector: true,
        },
      },
    },
  });
}

export async function getAllComplaints(
  prisma: PrismaClient,
  filters: {
    status?: string;
    priority?: string;
    category?: string;
    condominiumId?: string;
    sectorId?: string;
    assigneeId?: string;
  }
) {
  return prisma.complaint.findMany({
    where: {
      ...(filters.condominiumId && { condominiumId: filters.condominiumId }),
      ...(filters.status && { status: filters.status as ComplaintStatus }),
      ...(filters.priority && { priority: filters.priority as any }),
      ...(filters.category && { category: filters.category }),
      ...(filters.sectorId && { sectorId: filters.sectorId }),
      ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
    },
    include: {
      condominium: {
        select: { id: true, name: true },
      },
      resident: {
        select: {
          id: true,
          name: true,
          phone: true,
          tower: true,
          floor: true,
          unit: true,
        },
      },
      attachments: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
      sector: true,
      assignee: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ condominium: { name: "asc" } }, { createdAt: "desc" }],
  });
}

export async function getComplaintsByCondominium(
  prisma: PrismaClient,
  condominiumId: string,
  filters: {
    status?: string;
    priority?: string;
    category?: string;
    sectorId?: string;
    assigneeId?: string;
  }
) {
  return prisma.complaint.findMany({
    where: {
      condominiumId,
      ...(filters.status && { status: filters.status as ComplaintStatus }),
      ...(filters.priority && { priority: filters.priority as any }),
      ...(filters.category && { category: filters.category }),
      ...(filters.sectorId && { sectorId: filters.sectorId }),
      ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
    },
    include: {
      resident: {
        select: {
          id: true,
          name: true,
          phone: true,
          tower: true,
          floor: true,
          unit: true,
        },
      },
      attachments: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
      sector: true,
      assignee: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function assignComplaint(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  complaintId: number,
  data: AssignComplaintRequest,
  isAuto = false,
  actorId?: string
) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { sector: true },
  });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  const assigneeId = await resolveAssignee(
    prisma,
    data.sectorId,
    data.assigneeId
  );

  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      sectorId: data.sectorId,
      assigneeId,
      status: ComplaintStatus.IN_PROGRESS,
      responseAt: complaint.responseAt ?? new Date(),
    },
    include: {
      resident: true,
      assignee: true,
      sector: true,
    },
  });

  await prisma.complaintAssignment.create({
    data: {
      complaintId,
      sectorId: data.sectorId,
      assigneeId: assigneeId ?? null,
      assignedBy: actorId,
      reason: data.reason ?? (isAuto ? "Auto-assignment" : "Manual assignment"),
    },
  });

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: complaint.status,
      toStatus: ComplaintStatus.IN_PROGRESS,
      changedBy: actorId ?? "system",
      notes: data.reason,
      action: SLA_ACTIONS.ASSIGNMENT,
      metadata: {
        sectorId: data.sectorId,
        assigneeId,
        isAuto,
      },
    },
  });

  logger.info(
    {
      complaintId,
      sectorId: data.sectorId,
      assigneeId,
      isAuto,
    },
    "Complaint assigned"
  );
  return updated;
}

export async function pauseComplaintSla(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  complaintId: number,
  data: PauseComplaintSlaRequest,
  actorId: string
) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }
  if (complaint.status !== ComplaintStatus.IN_PROGRESS) {
    throw new BadRequestError(
      "A pausa de SLA só é permitida quando o chamado está em atendimento"
    );
  }
  const pausedUntil = data.pausedUntil ?? null;
  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      status: data.status as ComplaintStatus,
      pauseReason: data.reason,
      pausedUntil,
    },
  });

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: complaint.status,
      toStatus: data.status as ComplaintStatus,
      changedBy: actorId,
      notes: data.reason,
      action: SLA_ACTIONS.SLA_PAUSE,
      metadata: { pausedUntil },
    },
  });

  logger.info(`Complaint ${complaintId} paused with status ${data.status}`);
  return updated;
}

export async function resumeComplaintSla(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  complaintId: number,
  data: ResumeComplaintSlaRequest,
  actorId: string
) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }
  if (
    complaint.status !== ComplaintStatus.WAITING_USER &&
    complaint.status !== ComplaintStatus.WAITING_THIRD_PARTY
  ) {
    throw new BadRequestError("O chamado não está pausado");
  }
  const now = new Date();
  const lastPause = await prisma.complaintStatusHistory.findFirst({
    where: {
      complaintId,
      action: SLA_ACTIONS.SLA_PAUSE,
    },
    orderBy: { createdAt: "desc" },
  });
  const pausedSince = lastPause?.createdAt ?? complaint.updatedAt ?? now;
  const pausedUntilTarget = complaint.pausedUntil?.getTime() ?? now.getTime();
  const pauseDurationMs = Math.max(
    0,
    now.getTime() - pausedSince.getTime(),
    pausedUntilTarget - pausedSince.getTime()
  );
  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      status: ComplaintStatus.IN_PROGRESS,
      pausedUntil: null,
      pauseReason: null,
      resolutionDueAt:
        complaint.resolutionDueAt && pauseDurationMs > 0
          ? new Date(complaint.resolutionDueAt.getTime() + pauseDurationMs)
          : complaint.resolutionDueAt,
    },
  });
  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: complaint.status,
      toStatus: ComplaintStatus.IN_PROGRESS,
      changedBy: actorId,
      notes: data.notes,
      action: SLA_ACTIONS.SLA_RESUME,
    },
  });

  logger.info(`Complaint ${complaintId} resumed to IN_PROGRESS`);
  return updated;
}

export async function addComplaintAttachment(
  prisma: PrismaClient,
  complaintId: number,
  data: AddComplaintAttachmentRequest,
  actorId: string
) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  const attachment = await prisma.complaintAttachment.create({
    data: {
      complaintId,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
    },
  });

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: complaint.status,
      toStatus: complaint.status,
      changedBy: actorId,
      action: SLA_ACTIONS.COMMENT,
      metadata: {
        attachmentId: attachment.id,
        fileName: data.fileName,
        fileType: data.fileType,
      },
    },
  });

  return attachment;
}

async function findResidentById(prisma: PrismaClient, id: string) {
  return prisma.resident.findUnique({
    where: { id },
    include: { condominium: true },
  });
}

