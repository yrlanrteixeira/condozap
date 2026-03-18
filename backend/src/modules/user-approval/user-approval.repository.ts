import { Prisma, PrismaClient, UserStatus } from "@prisma/client";
import type { ResidentType } from "./user-approval.schema";

type TransactionClient = Prisma.TransactionClient;

const selectCondominium = {
  id: true,
  name: true,
  status: true,
} as const;

const selectPendingUser = {
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
} as const;

const selectPendingUserByCondominium = {
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
} as const;

const selectUserStatus = {
  id: true,
  name: true,
  email: true,
  status: true,
  approvedAt: true,
  rejectionReason: true,
  requestedTower: true,
  requestedFloor: true,
  requestedUnit: true,
} as const;

export async function findAllCondominiums(prisma: PrismaClient) {
  return prisma.condominium.findMany({
    select: selectCondominium,
    orderBy: { name: "asc" },
  });
}

export async function findPendingUsers(prisma: PrismaClient) {
  return prisma.user.findMany({
    where: { status: "PENDING" },
    select: selectPendingUser,
    orderBy: { createdAt: "desc" },
  });
}

export async function findPendingUsersByCondominium(
  prisma: PrismaClient,
  condominiumId: string
) {
  return prisma.user.findMany({
    where: {
      status: "PENDING",
      requestedCondominiumId: condominiumId,
    },
    select: selectPendingUserByCondominium,
    orderBy: { createdAt: "desc" },
  });
}

export async function findUserCondominiumAccess(
  prisma: PrismaClient,
  userId: string,
  condominiumId: string
) {
  return prisma.userCondominium.findFirst({
    where: { userId, condominiumId },
  });
}

export async function findPendingUserById(
  prisma: PrismaClient,
  userId: string
) {
  return prisma.user.findFirst({
    where: { id: userId, status: "PENDING" },
  });
}

export async function findCondominiumById(
  prisma: PrismaClient,
  condominiumId: string
) {
  return prisma.condominium.findUnique({
    where: { id: condominiumId },
  });
}

export async function updateUser(
  prisma: PrismaClient,
  userId: string,
  data: Prisma.UserUpdateInput
) {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}

export async function findUserStatus(prisma: PrismaClient, userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: selectUserStatus,
  });
}

// --- Transaction-level helpers (receive tx instead of PrismaClient) ---

export async function txUpdateUserStatus(
  tx: TransactionClient,
  userId: string,
  data: {
    status: UserStatus;
    approvedAt?: Date;
    approvedBy?: string;
  }
) {
  return tx.user.update({
    where: { id: userId },
    data,
  });
}

export async function txFindExistingResident(
  tx: TransactionClient,
  condominiumId: string,
  tower: string,
  floor: string,
  unit: string
) {
  return tx.resident.findFirst({
    where: { condominiumId, tower, floor, unit },
  });
}

export async function txUpdateResident(
  tx: TransactionClient,
  residentId: string,
  data: {
    userId: string;
    name: string;
    email: string;
    phone: string;
    type: ResidentType;
    consentWhatsapp: boolean;
    consentDataProcessing: boolean;
  }
) {
  return tx.resident.update({
    where: { id: residentId },
    data,
  });
}

export async function txCreateResident(
  tx: TransactionClient,
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
    consentWhatsapp: boolean;
    consentDataProcessing: boolean;
  }
) {
  return tx.resident.create({ data });
}

export async function txFindUserCondominiumLink(
  tx: TransactionClient,
  userId: string,
  condominiumId: string
) {
  return tx.userCondominium.findUnique({
    where: {
      userId_condominiumId: { userId, condominiumId },
    },
  });
}

export async function txCreateUserCondominiumLink(
  tx: TransactionClient,
  userId: string,
  condominiumId: string
) {
  return tx.userCondominium.create({
    data: {
      userId,
      condominiumId,
      role: "RESIDENT",
    },
  });
}
