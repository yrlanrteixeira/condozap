import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import * as complaintDb from "./complaints.db";
import { whatsappService } from "../whatsapp/whatsapp.service";
import {
  buildComplaintCreatedMessage,
  buildComplaintStatusMessage,
  buildComplaintPriorityMessage,
  buildComplaintCommentMessage,
} from "../../helpers/notifications.js";
import { NotFoundError } from "../../lib/errors.js";
import type {
  CreateComplaintRequest,
  UpdateComplaintStatusRequest,
  UpdateComplaintPriorityRequest,
  AddComplaintCommentRequest,
} from "./complaints.types.js";

export async function createComplaint(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateComplaintRequest
) {
  const resident = await findResidentById(prisma, data.residentId);
  if (!resident) {
    throw new NotFoundError("Resident");
  }

  const complaint = await complaintDb.createComplaint(prisma, data);

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
  const complaint = await complaintDb.findComplaintWithResident(prisma, id);
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  const updated = await complaintDb.updateComplaintStatus(
    prisma,
    id,
    data.status,
    userId
  );

  await complaintDb.createStatusHistory(prisma, {
    complaintId: id,
    fromStatus: complaint.status,
    toStatus: data.status,
    changedBy: userId,
    notes: data.notes,
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
  const complaint = await complaintDb.updateComplaintPriority(
    prisma,
    id,
    data.priority
  );

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
  const complaint = await complaintDb.findComplaintWithResident(prisma, id);
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  const historyEntry = await complaintDb.createStatusHistory(prisma, {
    complaintId: id,
    fromStatus: complaint.status,
    toStatus: complaint.status,
    changedBy: userId,
    notes: data.notes,
  });

  await complaintDb.updateComplaintTimestamp(prisma, id);

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
  await complaintDb.deleteComplaint(prisma, id);
  logger.info(`Complaint ${id} deleted`);
}

export async function getComplaintById(prisma: PrismaClient, id: number) {
  return complaintDb.findComplaintById(prisma, id);
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
  return complaintDb.findAllComplaints(prisma, filters);
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
  return complaintDb.findComplaintsByCondominium(
    prisma,
    condominiumId,
    filters
  );
}

async function findResidentById(prisma: PrismaClient, id: string) {
  return prisma.resident.findUnique({
    where: { id },
    include: { condominium: true },
  });
}
