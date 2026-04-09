import type { Prisma, PrismaClient } from "@prisma/client";

export async function writeAuditLog(
  prisma: PrismaClient,
  input: {
    actorUserId: string;
    action: string;
    resource: string;
    metadata?: Record<string, unknown>;
    ipAddress: string;
  }
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.actorUserId,
      action: input.action,
      resource: input.resource,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: input.ipAddress,
    },
  });
}
