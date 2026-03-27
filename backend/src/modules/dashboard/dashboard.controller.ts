import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import {
  condoMetricsParamsSchema,
  unifiedQuerySchema,
  type CondoMetricsParams,
  type UnifiedQuery,
} from "./dashboard.schema";
import {
  buildMetrics,
  getAllMetricsData,
  getCondominiumMetricsData,
  getUnifiedDashboard,
  parseCondominiumIds,
} from "./dashboard.service";
import { AuthUser } from "../../types/auth";
import { isCondominiumAllowed, resolveAccessContext } from "../../auth/context";


export async function getAllMetricsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const [complaints, residents, messages] = await getAllMetricsData(prisma);
  const metrics = buildMetrics(complaints, residents, messages);
  return reply.send(metrics);
}

export async function getCondominiumMetricsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = condoMetricsParamsSchema.parse(
    request.params
  ) as CondoMetricsParams;
  const user = request.user as AuthUser;
  const context = await resolveAccessContext(prisma, {
    id: user.id,
    role: user.role,
    permissionScope: user.permissionScope as any,
  });
  if (!isCondominiumAllowed(context, condominiumId)) {
    return reply.status(403).send({ error: "Acesso negado ao condomínio" });
  }

  const [complaints, residents, messages] = await getCondominiumMetricsData(
    prisma,
    condominiumId
  );

  const metrics = buildMetrics(complaints, residents, messages);
  return reply.send(metrics);
}

export async function getUnifiedDashboardHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumIds } = unifiedQuerySchema.parse(
    request.query
  ) as UnifiedQuery;
  const user = request.user as AuthUser;
  const context = await resolveAccessContext(prisma, {
    id: user.id,
    role: user.role,
    permissionScope: user.permissionScope as any,
  });

  const condoIds = parseCondominiumIds(condominiumIds);

  if (condoIds.length === 0) {
    return reply.status(400).send({
      error: "Bad Request",
      message: "Pelo menos um condomínio deve ser informado",
    });
  }

  const filteredCondoIds = condoIds.filter((id) => isCondominiumAllowed(context, id));
  if (!filteredCondoIds.length) {
    return reply
      .status(403)
      .send({ error: "Acesso negado aos condomínios solicitados" });
  }

  const dashboard = await getUnifiedDashboard(prisma, filteredCondoIds);
  return reply.send(dashboard);
}

export async function getActionableDashboardHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const condominiumId = (request.params as any).condominiumId;
  const now = new Date();

  // === SLA AT RISK ===
  // Find complaints where SLA deadline is within next 2 hours and not yet escalated
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60000);
  const slaAtRiskComplaints = await prisma.complaint.findMany({
    where: {
      condominiumId,
      status: { in: ["NEW", "TRIAGE", "IN_PROGRESS"] },
      escalatedAt: null,
      OR: [
        { responseDueAt: { lte: twoHoursFromNow, gt: now }, responseAt: null },
        { resolutionDueAt: { lte: twoHoursFromNow, gt: now }, status: "IN_PROGRESS" },
      ],
    },
    include: { resident: { select: { name: true } } },
    orderBy: { responseDueAt: "asc" },
    take: 10,
  });

  const slaAtRisk = slaAtRiskComplaints.map((c) => {
    const isResponse =
      c.responseDueAt && !c.responseAt && c.responseDueAt <= twoHoursFromNow;
    const deadline = isResponse ? c.responseDueAt! : c.resolutionDueAt!;
    return {
      complaintId: c.id,
      category: c.category,
      priority: c.priority,
      slaType: isResponse ? ("response" as const) : ("resolution" as const),
      minutesRemaining: Math.max(
        0,
        Math.round((deadline.getTime() - now.getTime()) / 60000)
      ),
      residentName: c.resident.name,
    };
  });

  // === PENDING APPROVALS ===
  const pendingUsers = await prisma.user.findMany({
    where: { status: "PENDING", requestedCondominiumId: condominiumId },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const oldestPending = pendingUsers[0];
  const pendingApprovals = {
    count: pendingUsers.length,
    oldestDays: oldestPending
      ? Math.floor(
          (now.getTime() - oldestPending.createdAt.getTime()) / 86400000
        )
      : 0,
  };

  // === CSAT SUMMARY ===
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

  const csatRecent = await prisma.complaint.findMany({
    where: {
      condominiumId,
      csatScore: { not: null },
      csatRespondedAt: { gte: thirtyDaysAgo },
    },
    select: { csatScore: true, category: true },
  });
  const csatPrevious = await prisma.complaint.findMany({
    where: {
      condominiumId,
      csatScore: { not: null },
      csatRespondedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
    },
    select: { csatScore: true },
  });

  const avgRecent =
    csatRecent.length > 0
      ? csatRecent.reduce((s, c) => s + (c.csatScore || 0), 0) /
        csatRecent.length
      : 0;
  const avgPrevious =
    csatPrevious.length > 0
      ? csatPrevious.reduce((s, c) => s + (c.csatScore || 0), 0) /
        csatPrevious.length
      : 0;

  // Worst category
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const c of csatRecent) {
    const entry = byCategory.get(c.category) || { total: 0, count: 0 };
    entry.total += c.csatScore || 0;
    entry.count++;
    byCategory.set(c.category, entry);
  }
  let worstCategory: string | null = null;
  let worstCategoryScore: number | null = null;
  for (const [cat, { total, count }] of byCategory) {
    const avg = total / count;
    if (worstCategoryScore === null || avg < worstCategoryScore) {
      worstCategory = cat;
      worstCategoryScore = Math.round(avg * 10) / 10;
    }
  }

  const csatSummary = {
    averageScore: Math.round(avgRecent * 10) / 10,
    totalResponses: csatRecent.length,
    trend: Math.round((avgRecent - avgPrevious) * 10) / 10,
    worstCategory,
    worstCategoryScore,
  };

  // === RESOLUTION STATS ===
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfWeek.getTime() - 7 * 86400000);

  const resolvedThisWeek = await prisma.complaint.findMany({
    where: {
      condominiumId,
      status: { in: ["RESOLVED", "CLOSED"] },
      resolvedAt: { gte: startOfWeek },
    },
    select: {
      createdAt: true,
      resolvedAt: true,
      sectorId: true,
      sector: { select: { name: true } },
    },
  });
  const resolvedLastWeek = await prisma.complaint.findMany({
    where: {
      condominiumId,
      status: { in: ["RESOLVED", "CLOSED"] },
      resolvedAt: { gte: startOfLastWeek, lt: startOfWeek },
    },
    select: { createdAt: true, resolvedAt: true },
  });

  const avgHours = (items: { createdAt: Date; resolvedAt: Date | null }[]) => {
    const valid = items.filter((i) => i.resolvedAt);
    if (valid.length === 0) return 0;
    return (
      Math.round(
        (valid.reduce(
          (s, i) =>
            s + (i.resolvedAt!.getTime() - i.createdAt.getTime()) / 3600000,
          0
        ) /
          valid.length) *
          10
      ) / 10
    );
  };

  // By sector
  const sectorMap = new Map<
    string,
    { name: string; hours: number[]; open: number }
  >();
  for (const c of resolvedThisWeek) {
    const sName = c.sector?.name || "Sem setor";
    const entry = sectorMap.get(sName) || { name: sName, hours: [], open: 0 };
    if (c.resolvedAt) {
      entry.hours.push(
        (c.resolvedAt.getTime() - c.createdAt.getTime()) / 3600000
      );
    }
    sectorMap.set(sName, entry);
  }

  // Add open complaints count per sector
  const openBySector = await prisma.complaint.groupBy({
    by: ["sectorId"],
    where: {
      condominiumId,
      status: {
        in: ["NEW", "TRIAGE", "IN_PROGRESS", "WAITING_USER", "WAITING_THIRD_PARTY"],
      },
    },
    _count: true,
  });
  const sectorNames = await prisma.sector.findMany({
    where: { condominiumId },
    select: { id: true, name: true },
  });
  const sectorNameMap = new Map(sectorNames.map((s) => [s.id, s.name]));
  for (const g of openBySector) {
    const sName = sectorNameMap.get(g.sectorId || "") || "Sem setor";
    const entry = sectorMap.get(sName) || { name: sName, hours: [], open: 0 };
    entry.open = g._count;
    sectorMap.set(sName, entry);
  }

  const resolutionStats = {
    avgHoursThisWeek: avgHours(resolvedThisWeek),
    avgHoursLastWeek: avgHours(resolvedLastWeek),
    trend:
      resolvedLastWeek.length > 0
        ? Math.round(
            ((avgHours(resolvedThisWeek) - avgHours(resolvedLastWeek)) /
              avgHours(resolvedLastWeek)) *
              100
          )
        : 0,
    bySector: Array.from(sectorMap.values()).map((s) => ({
      sectorName: s.name,
      avgHours:
        s.hours.length > 0
          ? Math.round(
              (s.hours.reduce((a, b) => a + b, 0) / s.hours.length) * 10
            ) / 10
          : 0,
      openCount: s.open,
    })),
  };

  // === WEEKLY TREND ===
  const openedThisWeek = await prisma.complaint.count({
    where: { condominiumId, createdAt: { gte: startOfWeek } },
  });
  const openedLastWeek = await prisma.complaint.count({
    where: {
      condominiumId,
      createdAt: { gte: startOfLastWeek, lt: startOfWeek },
    },
  });

  const weeklyTrend = {
    opened: openedThisWeek,
    resolved: resolvedThisWeek.length,
    previousOpened: openedLastWeek,
    previousResolved: resolvedLastWeek.length,
  };

  return reply.send({
    slaAtRisk,
    pendingApprovals,
    csatSummary,
    resolutionStats,
    weeklyTrend,
  });
}
