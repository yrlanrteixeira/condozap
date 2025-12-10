import { PrismaClient, ComplaintStatus } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { whatsappService } from "../whatsapp/whatsapp.service";
import {
  buildComplaintCreatedMessage,
  buildComplaintStatusMessage,
  buildComplaintPriorityMessage,
  buildComplaintCommentMessage,
} from "../../shared/utils/notifications";
import { NotFoundError } from "../../shared/errors";
import type {
  CreateComplaintRequest,
  UpdateComplaintStatusRequest,
  UpdateComplaintPriorityRequest,
  AddComplaintCommentRequest,
} from "./complaints.schema";

export async function createComplaint(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateComplaintRequest
) {
  const resident = await findResidentById(prisma, data.residentId);
  if (!resident) {
    throw new NotFoundError("Resident");
  }

  const complaint = await prisma.complaint.create({
    data: {
      condominiumId: data.condominiumId,
      residentId: data.residentId,
      category: data.category,
      content: data.content,
      priority: data.priority || "MEDIUM",
      isAnonymous: data.isAnonymous ?? false,
    },
    include: {
      resident: true,
      attachments: true,
    },
  });

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

  return complaint;
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

  const updated = await prisma.complaint.update({
    where: { id },
    data: {
      status: data.status as ComplaintStatus,
      ...(data.status === "RESOLVED" && {
        resolvedAt: new Date(),
        resolvedBy: userId,
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
  }
) {
  return prisma.complaint.findMany({
    where: {
      ...(filters.condominiumId && { condominiumId: filters.condominiumId }),
      ...(filters.status && { status: filters.status as ComplaintStatus }),
      ...(filters.priority && { priority: filters.priority as any }),
      ...(filters.category && { category: filters.category }),
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
  }
) {
  return prisma.complaint.findMany({
    where: {
      condominiumId,
      ...(filters.status && { status: filters.status as ComplaintStatus }),
      ...(filters.priority && { priority: filters.priority as any }),
      ...(filters.category && { category: filters.category }),
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function findResidentById(prisma: PrismaClient, id: string) {
  return prisma.resident.findUnique({
    where: { id },
    include: { condominium: true },
  });
}
