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
import * as repo from "./user-approval.repository";

export async function getCondominiumsList(prisma: PrismaClient) {
  return repo.findAllCondominiums(prisma);
}

export async function getPendingUsers(prisma: PrismaClient) {
  return repo.findPendingUsers(prisma);
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
    const access = await repo.findUserCondominiumAccess(
      prisma,
      currentUser.id,
      condominiumId
    );
    if (!access) {
      throw new ForbiddenError("Você não tem acesso a este condomínio.");
    }
  }

  return repo.findPendingUsersByCondominium(prisma, condominiumId);
}

export async function approveUser(
  prisma: PrismaClient,
  approver: AuthUser,
  body: ApproveUserBody
) {
  const pendingUser = await repo.findPendingUserById(prisma, body.userId);
  if (!pendingUser) {
    throw new BadRequestError("Usuário não encontrado ou não está pendente.");
  }

  const condominium = await repo.findCondominiumById(
    prisma,
    body.condominiumId
  );
  if (!condominium) {
    throw new BadRequestError(
      "Condomínio não encontrado. Verifique o ID informado."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const approvedUser = await repo.txUpdateUserStatus(tx, body.userId, {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: approver.id,
    });

    const existingResident = await repo.txFindExistingResident(
      tx,
      body.condominiumId,
      body.tower,
      body.floor,
      body.unit
    );

    const phone = pendingUser.requestedPhone || "5500000000000";

    if (existingResident) {
      await repo.txUpdateResident(tx, existingResident.id, {
        userId: body.userId,
        name: approvedUser.name,
        email: approvedUser.email,
        phone: pendingUser.requestedPhone || existingResident.phone,
        type: (body.type as ResidentType) || "OWNER",
        consentWhatsapp: pendingUser.consentWhatsapp,
        consentDataProcessing: pendingUser.consentDataProcessing,
      });
    } else {
      await repo.txCreateResident(tx, {
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
      });
    }

    const existingLink = await repo.txFindUserCondominiumLink(
      tx,
      body.userId,
      body.condominiumId
    );

    if (!existingLink) {
      await repo.txCreateUserCondominiumLink(
        tx,
        body.userId,
        body.condominiumId
      );
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
  const pendingUser = await repo.findPendingUserById(prisma, body.userId);
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
    const access = await repo.findUserCondominiumAccess(
      prisma,
      currentUser.id,
      pendingUser.requestedCondominiumId
    );
    if (!access) {
      throw new ForbiddenError(
        "Você não tem permissão para rejeitar usuários deste condomínio."
      );
    }
  }

  return repo.updateUser(prisma, body.userId, {
    status: "REJECTED",
    rejectionReason: body.reason,
    approvedBy: currentUser.id,
  });
}

export async function getMyStatus(prisma: PrismaClient, userId: string) {
  const status = await repo.findUserStatus(prisma, userId);
  if (!status) {
    throw new NotFoundError("Usuário");
  }
  return status;
}
