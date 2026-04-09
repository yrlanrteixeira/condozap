import type { Prisma, PrismaClient } from "@prisma/client";

/** Metadados seguros para JSON (evita referências não serializáveis). */
function metadataToJson(
  metadata: Record<string, unknown> | undefined
): Prisma.InputJsonValue | undefined {
  if (metadata === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue;
}

export function buildAuditLogData(input: {
  actorUserId: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
}): Prisma.AuditLogCreateInput {
  return {
    userId: input.actorUserId,
    action: input.action,
    resource: input.resource,
    metadata: metadataToJson(input.metadata),
    ipAddress: input.ipAddress,
  };
}

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
    data: buildAuditLogData(input),
  });
}
