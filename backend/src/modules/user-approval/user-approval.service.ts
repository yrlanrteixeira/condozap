import { PrismaClient } from "@prisma/client";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors";
import type { AuthUser } from "../../types/auth";
import type {
  ApproveUserBody,
  RejectUserBody,
  ResidentType,
} from "./user-approval.schema";

export async function getCondominiumsList(prisma: PrismaClient) {
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

export async function getPendingUsers(prisma: PrismaClient) {
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

export async function getPendingUsersByCondominium(
  prisma: PrismaClient,
  condominiumId: string,
  currentUser: AuthUser
) {
  if (
    !["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"].includes(
      currentUser.role
    )
  ) {
    throw new ForbiddenError();
  }

  if (currentUser.role !== "SUPER_ADMIN") {
    const access = await prisma.userCondominium.findFirst({
      where: {
        userId: currentUser.id,
        condominiumId,
      },
    });
    if (!access) {
      throw new ForbiddenError("Você não tem acesso a este condomínio.");
    }
  }

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

export async function approveUser(
  prisma: PrismaClient,
  approver: AuthUser,
  body: ApproveUserBody
) {
  const pendingUser = await prisma.user.findFirst({
    where: {
      id: body.userId,
      status: "PENDING",
    },
  });
  if (!pendingUser) {
    throw new BadRequestError("Usuário não encontrado ou não está pendente.");
  }

  const condominium = await prisma.condominium.findUnique({
    where: { id: body.condominiumId },
  });
  if (!condominium) {
    throw new BadRequestError(
      "Condomínio não encontrado. Verifique o ID informado."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const approvedUser = await tx.user.update({
      where: { id: body.userId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: approver.id,
      },
    });

    const existingResident = await tx.resident.findFirst({
      where: {
        condominiumId: body.condominiumId,
        tower: body.tower,
        floor: body.floor,
        unit: body.unit,
      },
    });

    const phone = pendingUser.requestedPhone || "5500000000000";

    if (existingResident) {
      await tx.resident.update({
        where: { id: existingResident.id },
        data: {
          userId: body.userId,
          name: approvedUser.name,
          email: approvedUser.email,
          phone: pendingUser.requestedPhone || existingResident.phone,
          type: (body.type as ResidentType) || "OWNER",
          consentWhatsapp: pendingUser.consentWhatsapp,
          consentDataProcessing: pendingUser.consentDataProcessing,
        },
      });
    } else {
      await tx.resident.create({
        data: {
          condominiumId: body.condominiumId,
          userId: body.userId,
          name: approvedUser.name,
          email: approvedUser.email,
          phone,
          tower: body.tower,
          floor: body.floor,
          unit: body.unit,
          type: (body.type as ResidentType) || "OWNER",
          consentWhatsapp: pendingUser.consentWhatsapp,
          consentDataProcessing: pendingUser.consentDataProcessing,
        },
      });
    }

    const existingLink = await tx.userCondominium.findUnique({
      where: {
        userId_condominiumId: {
          userId: body.userId,
          condominiumId: body.condominiumId,
        },
      },
    });

    if (!existingLink) {
      await tx.userCondominium.create({
        data: {
          userId: body.userId,
          condominiumId: body.condominiumId,
          role: "RESIDENT",
        },
      });
    }

    return approvedUser;
  });

  return result;
}

export async function rejectUser(
  prisma: PrismaClient,
  currentUser: AuthUser,
  body: RejectUserBody
) {
  const pendingUser = await prisma.user.findFirst({
    where: {
      id: body.userId,
      status: "PENDING",
    },
  });
  if (!pendingUser) {
    throw new BadRequestError("Usuário não encontrado ou não está pendente.");
  }

  if (
    !["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"].includes(
      currentUser.role
    )
  ) {
    throw new ForbiddenError();
  }

  if (
    currentUser.role !== "SUPER_ADMIN" &&
    pendingUser.requestedCondominiumId
  ) {
    const access = await prisma.userCondominium.findFirst({
      where: {
        userId: currentUser.id,
        condominiumId: pendingUser.requestedCondominiumId,
      },
    });
    if (!access) {
      throw new ForbiddenError(
        "Você não tem permissão para rejeitar usuários deste condomínio."
      );
    }
  }

  return prisma.user.update({
    where: { id: body.userId },
    data: {
      status: "REJECTED",
      rejectionReason: body.reason,
      approvedBy: currentUser.id,
    },
  });
}

export async function getMyStatus(prisma: PrismaClient, userId: string) {
  const status = await prisma.user.findUnique({
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
  if (!status) {
    throw new NotFoundError("Usuário");
  }
  return status;
}
