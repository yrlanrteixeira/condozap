import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../shared/db/prisma";

export async function getPlatformStatsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalCondominiums,
    activeCondominiums,
    trialCondominiums,
    suspendedCondominiums,
    totalSyndics,
    newThisMonth,
    trialsExpiringSoon,
  ] = await Promise.all([
    prisma.condominium.count(),
    prisma.condominium.count({ where: { status: "ACTIVE" } }),
    prisma.condominium.count({ where: { status: "TRIAL" } }),
    prisma.condominium.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({
      where: { role: { in: ["SYNDIC", "PROFESSIONAL_SYNDIC"] } },
    }),
    prisma.condominium.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.condominium.count({
      where: {
        status: "TRIAL",
        trialEndsAt: { lte: sevenDaysFromNow, not: null },
      },
    }),
  ]);

  return reply.send({
    condominiums: {
      total: totalCondominiums,
      active: activeCondominiums,
      trial: trialCondominiums,
      suspended: suspendedCondominiums,
    },
    syndics: { total: totalSyndics },
    newThisMonth,
    trialsExpiringSoon,
  });
}
