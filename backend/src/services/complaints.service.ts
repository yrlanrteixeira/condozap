/**
 * Complaints Service
 *
 * Business logic for complaints
 */

import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import * as complaintDb from "../db/complaints.js";
import * as residentDb from "../db/residents.js";
import { whatsappService } from "./whatsapp.service.js";
import {
  buildComplaintCreatedMessage,
  buildComplaintStatusMessage,
  buildComplaintPriorityMessage,
  buildComplaintCommentMessage,
} from "../helpers/notifications.js";
import type {
  CreateComplaintRequest,
  UpdateComplaintStatusRequest,
  UpdateComplaintPriorityRequest,
  AddComplaintCommentRequest,
} from "../types/requests.js";

export async function createComplaint(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateComplaintRequest
) {
  // Validate resident exists
  const resident = await residentDb.findResidentById(prisma, data.residentId);
  if (!resident) {
    throw new Error("Resident not found");
  }

  // Create complaint
  const complaint = await complaintDb.createComplaint(prisma, data);

  // Send WhatsApp notification (async, don't block)
  if (resident.consentWhatsapp && !data.isAnonymous) {
    const message = buildComplaintCreatedMessage(
      resident.name,
      complaint.id,
      data.category,
      complaint.priority
    );
    whatsappService.sendTextMessage(resident.phone, message).catch((error) => {
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
    throw new Error("Complaint not found");
  }

  // Update status
  const updated = await complaintDb.updateComplaintStatus(
    prisma,
    id,
    data.status,
    userId
  );

  // Create status history
  await complaintDb.createStatusHistory(prisma, {
    complaintId: id,
    fromStatus: complaint.status,
    toStatus: data.status,
    changedBy: userId,
    notes: data.notes,
  });

  // Send WhatsApp notification (async)
  if (complaint.resident.consentWhatsapp) {
    const message = buildComplaintStatusMessage(
      complaint.resident.name,
      complaint.id,
      complaint.category,
      data.status,
      data.notes
    );
    whatsappService.sendTextMessage(complaint.resident.phone, message).catch((error) => {
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

  // Send WhatsApp notification (async)
  if (complaint.resident.consentWhatsapp) {
    const message = buildComplaintPriorityMessage(
      complaint.resident.name,
      complaint.id,
      data.priority
    );
    whatsappService.sendTextMessage(complaint.resident.phone, message).catch((error) => {
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
    throw new Error("Complaint not found");
  }

  // Create status history entry (comment)
  const historyEntry = await complaintDb.createStatusHistory(prisma, {
    complaintId: id,
    fromStatus: complaint.status,
    toStatus: complaint.status,
    changedBy: userId,
    notes: data.notes,
  });

  // Update timestamp
  await complaintDb.updateComplaintTimestamp(prisma, id);

  // Send WhatsApp notification (async)
  if (complaint.resident.consentWhatsapp) {
    const message = buildComplaintCommentMessage(
      complaint.resident.name,
      complaint.id,
      userRole,
      data.notes
    );
    whatsappService.sendTextMessage(complaint.resident.phone, message).catch((error) => {
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
  return complaintDb.findComplaintsByCondominium(prisma, condominiumId, filters);
}
