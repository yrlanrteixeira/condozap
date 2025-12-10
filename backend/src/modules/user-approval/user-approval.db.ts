import { PrismaClient, Prisma } from "@prisma/client";
import type { ResidentType } from "./user-approval.types";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function listCondominiums(prisma: DbClient) {
  return prisma.condominium.findMany({
    select: {
      id: true,
      name: true,
      status: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function listPendingUsers(prisma: DbClient) {
  return prisma.user.findMany({
    where: {
      status: "PENDING",
    },
    select: {
      id: true,
      name: true,
      email: true,
      requestedCondominiumId: true,
      requestedTower: true,
      requestedFloor: true,
      requestedUnit: true,
      requestedPhone: true,
      consentWhatsapp: true,
      consentDataProcessing: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function listPendingUsersByCondo(
  prisma: DbClient,
  condominiumId: string
) {
  return prisma.user.findMany({
    where: {
      status: "PENDING",
      requestedCondominiumId: condominiumId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      requestedTower: true,
      requestedFloor: true,
      requestedUnit: true,
      requestedPhone: true,
      consentWhatsapp: true,
      consentDataProcessing: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findPendingUser(prisma: DbClient, userId: string) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      status: "PENDING",
    },
  });
}

export async function findCondominium(prisma: DbClient, id: string) {
  return prisma.condominium.findUnique({
    where: { id },
  });
}

export async function findUserCondoAccess(
  prisma: DbClient,
  userId: string,
  condominiumId: string
) {
  return prisma.userCondominium.findFirst({
    where: {
      userId,
      condominiumId,
    },
  });
}

export async function updateUserStatusApproved(
  tx: DbClient,
  userId: string,
  approvedBy: string
) {
  return tx.user.update({
    where: { id: userId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy,
    },
  });
}

export async function updateUserStatusRejected(
  prisma: DbClient,
  userId: string,
  reason: string,
  rejectedBy: string
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
      approvedBy: rejectedBy,
    },
  });
}

export async function findResidentByUnit(
  tx: DbClient,
  condominiumId: string,
  tower: string,
  floor: string,
  unit: string
) {
  return tx.resident.findFirst({
    where: {
      condominiumId,
      tower,
      floor,
      unit,
    },
  });
}

export async function updateResidentWithUser(
  tx: DbClient,
  residentId: string,
  data: {
    userId: string;
    name: string;
    email: string;
    phone: string;
    type: ResidentType;
    consentWhatsapp?: boolean;
    consentDataProcessing?: boolean;
  }
) {
  return tx.resident.update({
    where: { id: residentId },
    data,
  });
}

export async function createResidentForUser(
  tx: DbClient,
  data: {
    condominiumId: string;
    userId: string;
    name: string;
    email: string;
    phone: string;
    tower: string;
    floor: string;
    unit: string;
    type: ResidentType;
    consentWhatsapp?: boolean;
    consentDataProcessing?: boolean;
  }
) {
  return tx.resident.create({
    data,
  });
}

export async function findUserCondominiumLink(
  tx: DbClient,
  userId: string,
  condominiumId: string
) {
  return tx.userCondominium.findUnique({
    where: {
      userId_condominiumId: {
        userId,
        condominiumId,
      },
    },
  });
}

export async function createUserCondominiumLink(
  tx: DbClient,
  userId: string,
  condominiumId: string,
  role: "RESIDENT" | "ADMIN" | "SYNDIC"
) {
  return tx.userCondominium.create({
    data: {
      userId,
      condominiumId,
      role,
    },
  });
}

export async function getUserStatus(prisma: DbClient, userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      approvedAt: true,
      rejectionReason: true,
      requestedTower: true,
      requestedFloor: true,
      requestedUnit: true,
    },
  });
}
