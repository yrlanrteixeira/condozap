/**
 * Users Service
 *
 * Business logic for user management
 */

import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import bcrypt from "bcryptjs";
import * as userDb from "../db/users.js";
import type {
  CreateAdminRequest,
  CreateSyndicRequest,
  UpdateUserRoleRequest,
  RemoveUserRequest,
  InviteUserRequest,
} from "../types/requests.js";

export async function createAdmin(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateAdminRequest,
  createdBy: string
) {
  // Check if email already exists
  const existingUser = await userDb.findUserByEmail(prisma, data.email);
  if (existingUser) {
    throw new Error("Email já está cadastrado no sistema");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create user
  const newAdmin = await userDb.createUser(prisma, {
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: "ADMIN",
    permissionScope: "LOCAL",
    status: "APPROVED",
    approvedAt: new Date(),
    approvedBy: createdBy,
  });

  // Link to condominium
  await userDb.createUserCondominiumLink(
    prisma,
    newAdmin.id,
    data.condominiumId,
    "ADMIN"
  );

  logger.info(`Admin ${newAdmin.email} created by ${createdBy} for condominium ${data.condominiumId}`);

  return newAdmin;
}

export async function createSyndic(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateSyndicRequest,
  createdBy: string
) {
  // Check if email already exists
  const existingUser = await userDb.findUserByEmail(prisma, data.email);
  if (existingUser) {
    throw new Error("Email já está cadastrado no sistema");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create user
  const newSyndic = await userDb.createUser(prisma, {
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: "SYNDIC",
    permissionScope: "LOCAL",
    status: "APPROVED",
    approvedAt: new Date(),
    approvedBy: createdBy,
  });

  // Link to condominiums
  const userCondominiumsData = data.condominiumIds.map((condoId) => ({
    userId: newSyndic.id,
    condominiumId: condoId,
    role: "SYNDIC" as const,
  }));

  await userDb.createManyUserCondominiumLinks(prisma, userCondominiumsData);

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
  const users = await userDb.findUsersByCondominium(prisma, condominiumId);

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
  // Cannot change own role
  if (data.userId === currentUserId) {
    throw new Error("Você não pode alterar sua própria função");
  }

  await userDb.updateUserRole(prisma, data.userId, data.newRole);

  logger.info(`User ${data.userId} role updated to ${data.newRole}`);
}

export async function removeUserFromCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: RemoveUserRequest,
  currentUserId: string
) {
  // Cannot remove self
  if (data.userId === currentUserId) {
    throw new Error("Você não pode remover a si mesmo");
  }

  // Remove condominium link
  await userDb.deleteUserCondominiumLink(
    prisma,
    data.userId,
    data.condominiumId
  );

  // Check if user still has other condominiums
  const remainingCondos = await userDb.countUserCondominiums(prisma, data.userId);

  // If no more condominiums, suspend user
  let userSuspended = false;
  if (remainingCondos === 0) {
    await userDb.updateUserStatus(prisma, data.userId, "SUSPENDED");
    userSuspended = true;
  }

  logger.info(`User ${data.userId} removed from condominium ${data.condominiumId}`);

  return { userSuspended };
}

export async function inviteUserToCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: InviteUserRequest
) {
  // Find user by email
  const targetUser = await userDb.findUserByEmail(prisma, data.email);
  if (!targetUser) {
    throw new Error("Usuário não encontrado. Crie um novo administrador.");
  }

  // Check if already linked
  const existingLink = await userDb.findUserCondominiumLink(
    prisma,
    targetUser.id,
    data.condominiumId
  );
  if (existingLink) {
    throw new Error("Este usuário já está vinculado ao condomínio");
  }

  // Link to condominium
  await userDb.createUserCondominiumLink(
    prisma,
    targetUser.id,
    data.condominiumId,
    data.role
  );

  logger.info(`User ${targetUser.email} invited to condominium ${data.condominiumId}`);

  return {
    id: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    role: data.role,
  };
}
