import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import bcrypt from "bcryptjs";
import type {
  CreateAdminRequest,
  CreateSyndicRequest,
  UpdateUserRoleRequest,
  RemoveUserRequest,
  InviteUserRequest,
  UserRole,
} from "./user-management.schema";

export async function createAdmin(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateAdminRequest,
  createdBy: string
) {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    throw new Error("Email já está cadastrado no sistema");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newAdmin = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: "ADMIN",
      permissionScope: "LOCAL",
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: createdBy,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  await prisma.userCondominium.create({
    data: {
      userId: newAdmin.id,
      condominiumId: data.condominiumId,
      role: "ADMIN",
    },
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
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    throw new Error("Email já está cadastrado no sistema");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newSyndic = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: "SYNDIC",
      permissionScope: "LOCAL",
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: createdBy,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  const userCondominiumsData = data.condominiumIds.map((condoId) => ({
    userId: newSyndic.id,
    condominiumId: condoId,
    role: "SYNDIC" as const,
  }));

  await prisma.userCondominium.createMany({
    data: userCondominiumsData,
  });

  logger.info(
    `Syndic ${newSyndic.email} created by ${createdBy} for ${data.condominiumIds.length} condominiums`
  );

  return {
    user: newSyndic,
    condominiumsCount: data.condominiumIds.length,
  };
}

export async function getUsersByCondominium(
  prisma: PrismaClient,
  condominiumId: string
) {
  const users = await prisma.userCondominium.findMany({
    where: { condominiumId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          approvedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users.map((uc) => ({
    id: uc.user.id,
    email: uc.user.email,
    name: uc.user.name,
    role: uc.role,
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
    throw new Error("Você não pode alterar sua própria função");
  }

  await prisma.user.update({
    where: { id: data.userId },
    data: { role: data.newRole as UserRole },
  });

  await prisma.userCondominium.updateMany({
    where: { userId: data.userId },
    data: { role: data.newRole as UserRole },
  });

  logger.info(`User ${data.userId} role updated to ${data.newRole}`);
}

export async function removeUserFromCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: RemoveUserRequest,
  currentUserId: string
) {
  if (data.userId === currentUserId) {
    throw new Error("Você não pode remover a si mesmo");
  }

  await prisma.userCondominium.deleteMany({
    where: {
      userId: data.userId,
      condominiumId: data.condominiumId,
    },
  });

  const remainingCondos = await prisma.userCondominium.count({
    where: { userId: data.userId },
  });

  let userSuspended = false;
  if (remainingCondos === 0) {
    await prisma.user.update({
      where: { id: data.userId },
      data: { status: "SUSPENDED" },
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
  const targetUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (!targetUser) {
    throw new Error("Usuário não encontrado. Crie um novo administrador.");
  }

  const existingLink = await prisma.userCondominium.findFirst({
    where: {
      userId: targetUser.id,
      condominiumId: data.condominiumId,
    },
  });
  if (existingLink) {
    throw new Error("Este usuário já está vinculado ao condomínio");
  }

  await prisma.userCondominium.create({
    data: {
      userId: targetUser.id,
      condominiumId: data.condominiumId,
      role: data.role,
    },
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
