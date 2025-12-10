import { PrismaClient } from "@prisma/client";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../lib/errors";
import type { AuthUser } from "../../types/auth";
import {
  listCondominiums,
  listPendingUsers,
  listPendingUsersByCondo,
  findPendingUser,
  findCondominium,
  findUserCondoAccess,
  updateUserStatusApproved,
  updateUserStatusRejected,
  findResidentByUnit,
  updateResidentWithUser,
  createResidentForUser,
  findUserCondominiumLink,
  createUserCondominiumLink,
  getUserStatus,
} from "./user-approval.db";
import type { ApproveUserBody, RejectUserBody } from "./user-approval.types";

export async function getCondominiumsList(prisma: PrismaClient) {
  return listCondominiums(prisma);
}

export async function getPendingUsers(prisma: PrismaClient) {
  return listPendingUsers(prisma);
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
    const access = await findUserCondoAccess(
      prisma,
      currentUser.id,
      condominiumId
    );
    if (!access) {
      throw new ForbiddenError("Você não tem acesso a este condomínio.");
    }
  }

  return listPendingUsersByCondo(prisma, condominiumId);
}

export async function approveUser(
  prisma: PrismaClient,
  approver: AuthUser,
  body: ApproveUserBody
) {
  const pendingUser = await findPendingUser(prisma, body.userId);
  if (!pendingUser) {
    throw new BadRequestError("Usuário não encontrado ou não está pendente.");
  }

  const condominium = await findCondominium(prisma, body.condominiumId);
  if (!condominium) {
    throw new BadRequestError(
      "Condomínio não encontrado. Verifique o ID informado."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const approvedUser = await updateUserStatusApproved(
      tx,
      body.userId,
      approver.id
    );

    const existingResident = await findResidentByUnit(
      tx,
      body.condominiumId,
      body.tower,
      body.floor,
      body.unit
    );

    const phone = pendingUser.requestedPhone || "5500000000000";

    if (existingResident) {
      await updateResidentWithUser(tx, existingResident.id, {
        userId: body.userId,
        name: approvedUser.name,
        email: approvedUser.email,
        phone: pendingUser.requestedPhone || existingResident.phone,
        type: body.type || "OWNER",
        consentWhatsapp: pendingUser.consentWhatsapp,
        consentDataProcessing: pendingUser.consentDataProcessing,
      });
    } else {
      await createResidentForUser(tx, {
        condominiumId: body.condominiumId,
        userId: body.userId,
        name: approvedUser.name,
        email: approvedUser.email,
        phone,
        tower: body.tower,
        floor: body.floor,
        unit: body.unit,
        type: body.type || "OWNER",
        consentWhatsapp: pendingUser.consentWhatsapp,
        consentDataProcessing: pendingUser.consentDataProcessing,
      });
    }

    const existingLink = await findUserCondominiumLink(
      tx,
      body.userId,
      body.condominiumId
    );

    if (!existingLink) {
      await createUserCondominiumLink(
        tx,
        body.userId,
        body.condominiumId,
        "RESIDENT"
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
  const pendingUser = await findPendingUser(prisma, body.userId);
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
    const access = await findUserCondoAccess(
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

  return updateUserStatusRejected(
    prisma,
    body.userId,
    body.reason,
    currentUser.id
  );
}

export async function getMyStatus(prisma: PrismaClient, userId: string) {
  const status = await getUserStatus(prisma, userId);
  if (!status) {
    throw new NotFoundError("Usuário");
  }
  return status;
}
