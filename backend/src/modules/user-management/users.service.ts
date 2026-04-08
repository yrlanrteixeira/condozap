import { PrismaClient, UserRole as PrismaUserRole } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import bcrypt from "bcryptjs";
import { ConflictError, NotFoundError, BadRequestError } from "../../shared/errors";
import type {
  CreateAdminRequest,
  CreateSyndicRequest,
  CreateProfessionalSyndicRequest,
  UpdateSyndicRequest,
  UpdateUserRoleRequest,
  UpdateCouncilPositionRequest,
  RemoveUserRequest,
  InviteUserRequest,
  UserRole,
} from "./user-management.schema";
import * as usersRepository from "./users.repository";
import { EMAIL_CONFLICT_MESSAGE } from "./messages";

export async function createAdmin(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateAdminRequest,
  createdBy: string
) {
  const existingUser = await usersRepository.findUserByEmail(prisma, data.email);
  if (existingUser) {
    throw new ConflictError(EMAIL_CONFLICT_MESSAGE);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newAdmin = await usersRepository.createUser(prisma, {
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: "ADMIN" as PrismaUserRole,
    permissionScope: "LOCAL",
    status: "APPROVED",
    approvedAt: new Date(),
    approvedBy: createdBy,
  });

  const councilPosition =
    data.councilPosition === undefined || data.councilPosition === null
      ? null
      : data.councilPosition.trim() || null;

  await usersRepository.createUserCondominium(prisma, {
    userId: newAdmin.id,
    condominiumId: data.condominiumId,
    role: "ADMIN" as PrismaUserRole,
    councilPosition,
  });

  logger.info(
    `Admin ${newAdmin.email} created by ${createdBy} for condominium ${data.condominiumId}`
  );

  return newAdmin;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const TRIAL_DAYS = 14;

async function createTrialSubscription(
  prisma: PrismaClient,
  syndicId: string,
): Promise<void> {
  await prisma.subscription.create({
    data: {
      syndicId,
      status: "TRIAL",
      trialEndsAt: addDays(new Date(), TRIAL_DAYS),
    },
  });
}

export async function createSyndic(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateSyndicRequest,
  createdBy: string
) {
  const existingUser = await usersRepository.findUserByEmail(prisma, data.email);
  if (existingUser) {
    throw new ConflictError(EMAIL_CONFLICT_MESSAGE);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newSyndic = await usersRepository.createUser(prisma, {
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: "SYNDIC" as PrismaUserRole,
    permissionScope: "LOCAL",
    status: "APPROVED",
    approvedAt: new Date(),
    approvedBy: createdBy,
  });

  const userCondominiumsData = data.condominiumIds.map((condoId) => ({
    userId: newSyndic.id,
    condominiumId: condoId,
    role: "SYNDIC" as PrismaUserRole,
  }));

  await usersRepository.createManyUserCondominiums(prisma, userCondominiumsData);

  // Set primarySyndicId on each assigned condominium so cycle amount
  // calculation can resolve a tier. Skip condominiums that already have
  // a primary syndic to avoid clobbering existing ownership.
  if (data.condominiumIds.length > 0) {
    await prisma.condominium.updateMany({
      where: {
        id: { in: data.condominiumIds },
        primarySyndicId: null,
      },
      data: { primarySyndicId: newSyndic.id },
    });
  }

  // Provision a TRIAL subscription so the new syndic is not blocked by
  // the global billing hook on operational writes from day one.
  await createTrialSubscription(prisma, newSyndic.id);

  logger.info(
    `Syndic ${newSyndic.email} created by ${createdBy} for ${data.condominiumIds.length} condominiums`
  );

  return {
    user: newSyndic,
    condominiumsCount: data.condominiumIds.length,
  };
}

export async function createProfessionalSyndic(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateProfessionalSyndicRequest,
  createdBy: string
) {
  const existingUser = await usersRepository.findUserByEmail(prisma, data.email);
  if (existingUser) {
    throw new ConflictError(EMAIL_CONFLICT_MESSAGE);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newUser = await usersRepository.createUser(prisma, {
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: "PROFESSIONAL_SYNDIC" as PrismaUserRole,
    permissionScope: "GLOBAL",
    status: "APPROVED",
    approvedAt: new Date(),
    approvedBy: createdBy,
  });

  if (data.condominiumIds && data.condominiumIds.length > 0) {
    const userCondominiumsData = data.condominiumIds.map((condoId) => ({
      userId: newUser.id,
      condominiumId: condoId,
      role: "PROFESSIONAL_SYNDIC" as PrismaUserRole,
    }));

    await usersRepository.createManyUserCondominiums(prisma, userCondominiumsData);

    // Set primarySyndicId for billing-tier resolution
    await prisma.condominium.updateMany({
      where: {
        id: { in: data.condominiumIds },
        primarySyndicId: null,
      },
      data: { primarySyndicId: newUser.id },
    });
  }

  // Provision a TRIAL subscription
  await createTrialSubscription(prisma, newUser.id);

  logger.info(
    `ProfessionalSyndic ${newUser.email} created by ${createdBy} with GLOBAL scope`
  );

  return {
    user: newUser,
    condominiumsCount: data.condominiumIds?.length ?? 0,
  };
}

export async function updateSyndic(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  userId: string,
  data: UpdateSyndicRequest,
  updatedBy: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("Usuário");
  }
  if (user.role !== "SYNDIC" && user.role !== "PROFESSIONAL_SYNDIC") {
    throw new BadRequestError("Este usuário não é um síndico");
  }

  const condominiumIds = data.condominiumIds;
  if (condominiumIds.length > 0) {
    const found = await prisma.condominium.count({
      where: { id: { in: condominiumIds } },
    });
    if (found !== condominiumIds.length) {
      throw new BadRequestError("Um ou mais condomínios não foram encontrados");
    }
  }

  if (data.email !== user.email) {
    const existingUser = await usersRepository.findUserByEmail(prisma, data.email);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictError(EMAIL_CONFLICT_MESSAGE);
    }
  }

  const permissionScope = data.role === "PROFESSIONAL_SYNDIC" ? "GLOBAL" : "LOCAL";
  const linkRole = data.role as PrismaUserRole;

  const passwordPatch: { password?: string } = {};
  if (data.password && data.password.length >= 8) {
    passwordPatch.password = await bcrypt.hash(data.password, 10);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        role: linkRole,
        permissionScope,
        ...passwordPatch,
      },
    });

    const existing = await tx.userCondominium.findMany({ where: { userId } });
    const existingByCondo = new Map(
      existing.map((row) => [row.condominiumId, row])
    );
    const newIdSet = new Set(condominiumIds);

    const toRemove = existing.filter((row) => !newIdSet.has(row.condominiumId));
    if (toRemove.length > 0) {
      await tx.userCondominium.deleteMany({
        where: {
          userId,
          condominiumId: { in: toRemove.map((r) => r.condominiumId) },
        },
      });
    }

    if (condominiumIds.length > 0) {
      await tx.userCondominium.updateMany({
        where: { userId, condominiumId: { in: condominiumIds } },
        data: { role: linkRole },
      });
    }

    const toAdd = condominiumIds.filter((id) => !existingByCondo.has(id));
    if (toAdd.length > 0) {
      await tx.userCondominium.createMany({
        data: toAdd.map((condominiumId) => ({
          userId,
          condominiumId,
          role: linkRole,
        })),
      });
    }
  });

  logger.info(`Syndic ${userId} updated by ${updatedBy}`);
}

export async function getUsersByCondominium(
  prisma: PrismaClient,
  condominiumId: string
) {
  const users = await usersRepository.findUsersByCondominium(prisma, condominiumId);

  return users.map((uc) => ({
    id: uc.user.id,
    email: uc.user.email,
    name: uc.user.name,
    role: uc.role,
    councilPosition: uc.councilPosition ?? null,
    globalRole: uc.user.role,
    status: uc.user.status,
    createdAt: uc.user.createdAt,
    approvedAt: uc.user.approvedAt,
  }));
}

export async function updateUserRole(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: UpdateUserRoleRequest,
  currentUserId: string
) {
  if (data.userId === currentUserId) {
    throw new BadRequestError("Você não pode alterar sua própria função");
  }

  await usersRepository.updateUser(prisma, data.userId, {
    role: data.newRole as UserRole,
  });

  await usersRepository.updateUserCondominiums(
    prisma,
    { userId: data.userId },
    { role: data.newRole as UserRole }
  );

  logger.info(`User ${data.userId} role updated to ${data.newRole}`);
}

export async function updateCouncilPosition(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: UpdateCouncilPositionRequest
) {
  const updated = await usersRepository.updateUserCondominiums(
    prisma,
    {
      userId: data.userId,
      condominiumId: data.condominiumId,
    },
    { councilPosition: data.councilPosition ?? null }
  );

  if (updated.count === 0) {
    throw new NotFoundError("Vínculo usuário-condomínio");
  }

  logger.info(
    `Council position for user ${data.userId} in condominium ${data.condominiumId} updated to ${data.councilPosition ?? "(vazio)"}`
  );

  return { councilPosition: data.councilPosition };
}

export async function removeUserFromCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: RemoveUserRequest,
  currentUserId: string
) {
  if (data.userId === currentUserId) {
    throw new BadRequestError("Você não pode remover a si mesmo");
  }

  await usersRepository.deleteUserCondominiums(prisma, {
    userId: data.userId,
    condominiumId: data.condominiumId,
  });

  const remainingCondos = await usersRepository.countUserCondominiums(prisma, {
    userId: data.userId,
  });

  let userSuspended = false;
  if (remainingCondos === 0) {
    await usersRepository.updateUser(prisma, data.userId, {
      status: "SUSPENDED",
    });
    userSuspended = true;
  }

  logger.info(
    `User ${data.userId} removed from condominium ${data.condominiumId}`
  );

  return { userSuspended };
}

export async function inviteUserToCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: InviteUserRequest
) {
  const targetUser = await usersRepository.findUserByEmail(prisma, data.email);
  if (!targetUser) {
    throw new NotFoundError("Usuário");
  }

  const existingLink = await usersRepository.findUserCondominiumLink(
    prisma,
    targetUser.id,
    data.condominiumId
  );
  if (existingLink) {
    throw new ConflictError("Este usuário já está vinculado ao condomínio");
  }

  await usersRepository.createUserCondominium(prisma, {
    userId: targetUser.id,
    condominiumId: data.condominiumId,
    role: data.role,
  });

  logger.info(
    `User ${targetUser.email} invited to condominium ${data.condominiumId}`
  );

  return {
    id: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    role: data.role,
  };
}
