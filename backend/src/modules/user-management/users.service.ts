import { PrismaClient, UserRole as PrismaUserRole } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import bcrypt from "bcryptjs";
import { ConflictError, NotFoundError, BadRequestError } from "../../shared/errors";
import type {
  CreateAdminRequest,
  CreateSyndicRequest,
  CreateProfessionalSyndicRequest,
  UpdateUserRoleRequest,
  UpdateCouncilPositionRequest,
  RemoveUserRequest,
  InviteUserRequest,
  UserRole,
} from "./user-management.schema";
import * as usersRepository from "./users.repository";

export async function createAdmin(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateAdminRequest,
  createdBy: string
) {
  const existingUser = await usersRepository.findUserByEmail(prisma, data.email);
  if (existingUser) {
    throw new ConflictError("Email já está cadastrado no sistema");
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

  await usersRepository.createUserCondominium(prisma, {
    userId: newAdmin.id,
    condominiumId: data.condominiumId,
    role: "ADMIN" as PrismaUserRole,
  });

  logger.info(
    `Admin ${newAdmin.email} created by ${createdBy} for condominium ${data.condominiumId}`
  );

  return newAdmin;
}

export async function createSyndic(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateSyndicRequest,
  createdBy: string
) {
  const existingUser = await usersRepository.findUserByEmail(prisma, data.email);
  if (existingUser) {
    throw new ConflictError("Email já está cadastrado no sistema");
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
    throw new ConflictError("Email já está cadastrado no sistema");
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
  }

  logger.info(
    `ProfessionalSyndic ${newUser.email} created by ${createdBy} with GLOBAL scope`
  );

  return {
    user: newUser,
    condominiumsCount: data.condominiumIds?.length ?? 0,
  };
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
