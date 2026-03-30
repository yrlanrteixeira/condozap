import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { BadRequestError } from "../../shared/errors";

export async function getSectorDashboardStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as any;
  const sectorId = (request.query as any).sectorId as string | undefined;

  const memberships = await prisma.sectorMember.findMany({
    where: { userId: user.id, isActive: true },
    select: { sectorId: true },
  });

  const targetSectorId = sectorId || memberships[0]?.sectorId;
  if (!targetSectorId || !memberships.some((m) => m.sectorId === targetSectorId)) {
    throw new BadRequestError("Setor não encontrado ou sem acesso");
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [openCount, resolvedLast30Days, slaData] = await Promise.all([
    prisma.complaint.count({
      where: { sectorId: targetSectorId, status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] } },
    }),
    prisma.complaint.count({
      where: {
        sectorId: targetSectorId,
        status: { in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.complaint.findMany({
      where: {
        sectorId: targetSectorId,
        responseDueAt: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { responseAt: true, responseDueAt: true },
    }),
  ]);

  const slaTotal = slaData.length;
  const slaCompliant = slaData.filter(
    (c) => c.responseAt && c.responseDueAt && new Date(c.responseAt) <= new Date(c.responseDueAt)
  ).length;
  // NULL responseAt with past responseDueAt = SLA breach
  const slaCompliancePercent = slaTotal > 0 ? Math.round((slaCompliant / slaTotal) * 100) : 100;

  const responded = slaData.filter((c) => c.responseAt && c.responseDueAt);
  const avgResponseTimeHours = responded.length > 0
    ? Math.abs(Math.round(
        responded.reduce((sum, c) => {
          return sum + (new Date(c.responseAt!).getTime() - new Date(c.responseDueAt!).getTime());
        }, 0) / responded.length / (1000 * 60 * 60)
      ))
    : 0;

  return reply.send({
    openCount,
    resolvedLast30Days,
    slaCompliancePercent,
    avgResponseTimeHours,
  });
}
