/**
 * Users Data Access
 *
 * Simple functions for database operations
 */

import { PrismaClient } from "@prisma/client";

// ============================================
// Query Functions
// ============================================

export async function findUserByEmail(prisma: PrismaClient, email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserById(prisma: PrismaClient, id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function findUsersByCondominium(
  prisma: PrismaClient,
  condominiumId: string
) {
  return prisma.userCondominium.findMany({
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
}

export async function findUserCondominiumLink(
  prisma: PrismaClient,
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

export async function countUserCondominiums(prisma: PrismaClient, userId: string) {
  return prisma.userCondominium.count({
    where: { userId },
  });
}

// ============================================
// Mutation Functions
// ============================================

export async function createUser(
  prisma: PrismaClient,
  data: {
    email: string;
    password: string;
    name: string;
    role: "ADMIN" | "SYNDIC" | "RESIDENT";
    permissionScope?: string;
    status?: string;
    approvedAt?: Date;
    approvedBy?: string;
  }
) {
  return prisma.user.create({
    data: {
      ...data,
      permissionScope: data.permissionScope || "LOCAL",
      status: data.status || "APPROVED",
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
}

export async function createUserCondominiumLink(
  prisma: PrismaClient,
  userId: string,
  condominiumId: string,
  role: "ADMIN" | "SYNDIC" | "RESIDENT"
) {
  return prisma.userCondominium.create({
    data: {
      userId,
      condominiumId,
      role,
    },
  });
}

export async function createManyUserCondominiumLinks(
  prisma: PrismaClient,
  data: Array<{
    userId: string;
    condominiumId: string;
    role: "ADMIN" | "SYNDIC" | "RESIDENT";
  }>
) {
  return prisma.userCondominium.createMany({
    data,
  });
}

export async function updateUserRole(
  prisma: PrismaClient,
  userId: string,
  newRole: "ADMIN" | "SYNDIC" | "RESIDENT"
) {
  // Update user global role
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  // Update all condominium links
  await prisma.userCondominium.updateMany({
    where: { userId },
    data: { role: newRole },
  });
}

export async function updateUserStatus(
  prisma: PrismaClient,
  userId: string,
  status: string
) {
  return prisma.user.update({
    where: { id: userId },
    data: { status },
  });
}

export async function deleteUserCondominiumLink(
  prisma: PrismaClient,
  userId: string,
  condominiumId: string
) {
  return prisma.userCondominium.deleteMany({
    where: {
      userId,
      condominiumId,
    },
  });
}
