import { PrismaClient, ActivityType } from "@prisma/client";

export interface CreateActivityLogInput {
  condominiumId: string;
  userId: string;
  userName?: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  targetId?: string;
  targetType?: string;
  status?: string;
  errorMessage?: string;
}

export async function createActivityLog(
  prisma: PrismaClient,
  input: CreateActivityLogInput
) {
  return prisma.activityLog.create({
    data: {
      condominiumId: input.condominiumId,
      userId: input.userId,
      userName: input.userName,
      type: input.type,
      description: input.description,
      metadata: input.metadata as any,
      targetId: input.targetId,
      targetType: input.targetType,
      status: input.status || "success",
      errorMessage: input.errorMessage,
    },
  });
}

export async function getActivityLogs(
  prisma: PrismaClient,
  condominiumId: string,
  options?: {
    type?: ActivityType;
    userId?: string;
    limit?: number;
    offset?: number;
  }
) {
  return prisma.activityLog.findMany({
    where: {
      condominiumId,
      ...(options?.type && { type: options.type }),
      ...(options?.userId && { userId: options.userId }),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit || 100,
    skip: options?.offset || 0,
  });
}

export async function getAllActivityLogs(
  prisma: PrismaClient,
  options?: {
    type?: ActivityType;
    userId?: string;
    limit?: number;
    offset?: number;
  }
) {
  return prisma.activityLog.findMany({
    where: {
      ...(options?.type && { type: options.type }),
      ...(options?.userId && { userId: options.userId }),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit || 100,
    skip: options?.offset || 0,
  });
}