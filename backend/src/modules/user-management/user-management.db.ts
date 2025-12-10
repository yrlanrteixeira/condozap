import { PrismaClient, Prisma } from "@prisma/client";
import type { UserRole } from "./user-management.types";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function findUserByEmail(prisma: DbClient, email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function createUser(
  prisma: DbClient,
  data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
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
  prisma: DbClient,
  userId: string,
  condominiumId: string,
  role: UserRole
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
  prisma: DbClient,
  data: Array<{
    userId: string;
    condominiumId: string;
    role: UserRole;
  }>
) {
  return prisma.userCondominium.createMany({
    data,
  });
}

export async function findUsersByCondominium(
  prisma: DbClient,
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

export async function updateUserRole(
  prisma: DbClient,
  userId: string,
  newRole: UserRole
) {
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  await prisma.userCondominium.updateMany({
    where: { userId },
    data: { role: newRole },
  });
}

export async function deleteUserCondominiumLink(
  prisma: DbClient,
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

export async function countUserCondominiums(prisma: DbClient, userId: string) {
  return prisma.userCondominium.count({
    where: { userId },
  });
}

export async function updateUserStatus(
  prisma: DbClient,
  userId: string,
  status: string
) {
  return prisma.user.update({
    where: { id: userId },
    data: { status },
  });
}
import { PrismaClient, Prisma } from "@prisma/client";
import type { UserRole } from "./user-management.types";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function findUserByEmail(prisma: DbClient, email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function createUser(
  prisma: DbClient,
  data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
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
  prisma: DbClient,
  userId: string,
  condominiumId: string,
  role: UserRole
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
  prisma: DbClient,
  data: Array<{
    userId: string;
    condominiumId: string;
    role: UserRole;
  }>
) {
  return prisma.userCondominium.createMany({
    data,
  });
}

export async function findUsersByCondominium(
  prisma: DbClient,
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

export async function updateUserRole(
  prisma: DbClient,
  userId: string,
  newRole: UserRole
) {
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  await prisma.userCondominium.updateMany({
    where: { userId },
    data: { role: newRole },
  });
}

export async function deleteUserCondominiumLink(
  prisma: DbClient,
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

export async function countUserCondominiums(prisma: DbClient, userId: string) {
  return prisma.userCondominium.count({
    where: { userId },
  });
}

export async function updateUserStatus(
  prisma: DbClient,
  userId: string,
  status: string
) {
  return prisma.user.update({
    where: { id: userId },
    data: { status },
  });
}

