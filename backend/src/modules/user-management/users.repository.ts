import { Prisma, PrismaClient, UserRole, PermissionScope, UserStatus } from "@prisma/client";

const userDefaultSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const userCondominiumWithUser = {
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
} satisfies Prisma.UserCondominiumInclude;

export const findUserByEmail = (prisma: PrismaClient, email: string) =>
  prisma.user.findUnique({
    where: { email },
  });

export const createUser = (
  prisma: PrismaClient,
  data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    permissionScope: PermissionScope;
    status: UserStatus;
    approvedAt: Date;
    approvedBy: string;
  }
) =>
  prisma.user.create({
    data,
    select: userDefaultSelect,
  });

export const updateUser = (
  prisma: PrismaClient,
  id: string,
  data: Prisma.UserUpdateInput
) =>
  prisma.user.update({
    where: { id },
    data,
  });

export const createUserCondominium = (
  prisma: PrismaClient,
  data: {
    userId: string;
    condominiumId: string;
    role: UserRole;
  }
) =>
  prisma.userCondominium.create({
    data,
  });

export const createManyUserCondominiums = (
  prisma: PrismaClient,
  data: {
    userId: string;
    condominiumId: string;
    role: UserRole;
  }[]
) =>
  prisma.userCondominium.createMany({
    data,
  });

export const findUsersByCondominium = (
  prisma: PrismaClient,
  condominiumId: string
) =>
  prisma.userCondominium.findMany({
    where: { condominiumId },
    include: userCondominiumWithUser,
    orderBy: {
      createdAt: "desc",
    },
  });

export const updateUserCondominiums = (
  prisma: PrismaClient,
  where: Prisma.UserCondominiumWhereInput,
  data: Prisma.UserCondominiumUpdateManyMutationInput
) =>
  prisma.userCondominium.updateMany({
    where,
    data,
  });

export const deleteUserCondominiums = (
  prisma: PrismaClient,
  where: Prisma.UserCondominiumWhereInput
) =>
  prisma.userCondominium.deleteMany({
    where,
  });

export const countUserCondominiums = (
  prisma: PrismaClient,
  where: Prisma.UserCondominiumWhereInput
) =>
  prisma.userCondominium.count({
    where,
  });

export const findUserCondominiumLink = (
  prisma: PrismaClient,
  userId: string,
  condominiumId: string
) =>
  prisma.userCondominium.findFirst({
    where: {
      userId,
      condominiumId,
    },
  });
