import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";

// ---------------------------------------------------------------------------
// CSV helper
// ---------------------------------------------------------------------------

function toCsv(headers: string[], rows: string[][]): string {
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// Query param types
// ---------------------------------------------------------------------------

type ReportType = "complaints" | "messages" | "residents" | "satisfaction";
type ReportFormat = "json" | "csv";

interface ReportQueryParams {
  startDate?: string;
  endDate?: string;
  format?: ReportFormat;
  type?: ReportType;
}

interface ReportRouteParams {
  condominiumId: string;
}

// ---------------------------------------------------------------------------
// Report builders – JSON data
// ---------------------------------------------------------------------------

async function buildComplaintsReport(
  condominiumId: string,
  start: Date,
  end: Date
) {
  const complaints = await prisma.complaint.findMany({
    where: {
      condominiumId,
      createdAt: { gte: start, lte: end },
    },
    include: {
      sector: { select: { id: true, name: true } },
    },
  });

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const bySectorMap: Record<
    string,
    { name: string; total: number; totalHours: number; resolvedCount: number }
  > = {};

  let totalResolutionHours = 0;
  let resolvedCount = 0;
  let opened = 0;
  let resolved = 0;
  let cancelled = 0;

  for (const c of complaints) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    byPriority[c.priority] = (byPriority[c.priority] ?? 0) + 1;
    byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;

    if (["NEW", "TRIAGE", "IN_PROGRESS", "WAITING_USER", "WAITING_THIRD_PARTY", "OPEN"].includes(c.status)) {
      opened++;
    }
    if (["RESOLVED", "CLOSED"].includes(c.status)) {
      resolved++;
    }
    if (c.status === "CANCELLED") {
      cancelled++;
    }

    if (c.resolvedAt) {
      const hours = (c.resolvedAt.getTime() - c.createdAt.getTime()) / 3_600_000;
      totalResolutionHours += hours;
      resolvedCount++;
    }

    const sectorKey = c.sector?.id ?? "no-sector";
    const sectorName = c.sector?.name ?? "Sem setor";
    const entry = bySectorMap[sectorKey] ?? {
      name: sectorName,
      total: 0,
      totalHours: 0,
      resolvedCount: 0,
    };
    entry.total++;
    if (c.resolvedAt) {
      entry.totalHours +=
        (c.resolvedAt.getTime() - c.createdAt.getTime()) / 3_600_000;
      entry.resolvedCount++;
    }
    bySectorMap[sectorKey] = entry;
  }

  const avgResolutionHours =
    resolvedCount > 0
      ? Math.round((totalResolutionHours / resolvedCount) * 10) / 10
      : 0;

  const bySector = Object.values(bySectorMap).map((s) => ({
    name: s.name,
    total: s.total,
    avgHours:
      s.resolvedCount > 0
        ? Math.round((s.totalHours / s.resolvedCount) * 10) / 10
        : 0,
  }));

  return {
    summary: {
      total: complaints.length,
      opened,
      resolved,
      cancelled,
      avgResolutionHours,
    },
    byStatus,
    byPriority,
    byCategory,
    bySector,
    _raw: complaints,
  };
}

async function buildSatisfactionReport(
  condominiumId: string,
  start: Date,
  end: Date
) {
  const complaints = await prisma.complaint.findMany({
    where: {
      condominiumId,
      csatScore: { not: null },
      csatRespondedAt: { gte: start, lte: end },
    },
  });

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const byCategoryMap: Record<
    string,
    { total: number; count: number }
  > = {};

  let totalScore = 0;

  for (const c of complaints) {
    const score = c.csatScore as number;
    totalScore += score;
    if (score >= 1 && score <= 5) {
      distribution[score] = (distribution[score] ?? 0) + 1;
    }

    const entry = byCategoryMap[c.category] ?? { total: 0, count: 0 };
    entry.total += score;
    entry.count++;
    byCategoryMap[c.category] = entry;
  }

  const avgScore =
    complaints.length > 0
      ? Math.round((totalScore / complaints.length) * 10) / 10
      : 0;

  const byCategory = Object.entries(byCategoryMap).map(
    ([category, { total, count }]) => ({
      category,
      avgScore: Math.round((total / count) * 10) / 10,
      count,
    })
  );

  return {
    summary: {
      avgScore,
      totalResponses: complaints.length,
      distribution,
    },
    byCategory,
    _raw: complaints,
  };
}

async function buildMessagesReport(
  condominiumId: string,
  start: Date,
  end: Date
) {
  const messages = await prisma.message.findMany({
    where: {
      condominiumId,
      sentAt: { gte: start, lte: end },
    },
  });

  const byType: Record<string, number> = {};
  let totalRecipients = 0;
  let delivered = 0;

  for (const m of messages) {
    byType[m.type] = (byType[m.type] ?? 0) + 1;
    totalRecipients += m.recipientCount;
    if (["DELIVERED", "READ"].includes(m.whatsappStatus)) {
      delivered++;
    }
  }

  const deliveryRate =
    messages.length > 0
      ? Math.round((delivered / messages.length) * 1000) / 10
      : 0;

  return {
    summary: {
      total: messages.length,
      recipients: totalRecipients,
      deliveryRate,
    },
    byType,
    _raw: messages,
  };
}

async function buildResidentsReport(
  condominiumId: string,
  start: Date,
  end: Date
) {
  const residents = await prisma.resident.findMany({
    where: {
      condominiumId,
      createdAt: { gte: start, lte: end },
    },
  });

  const byTower: Record<string, number> = {};
  let owners = 0;
  let tenants = 0;
  let withConsent = 0;

  for (const r of residents) {
    byTower[r.tower] = (byTower[r.tower] ?? 0) + 1;
    if (r.type === "OWNER") owners++;
    if (r.type === "TENANT") tenants++;
    if (r.consentWhatsapp) withConsent++;
  }

  return {
    summary: {
      total: residents.length,
      owners,
      tenants,
      withConsent,
    },
    byTower,
    _raw: residents,
  };
}

// ---------------------------------------------------------------------------
// CSV converters
// ---------------------------------------------------------------------------

function complaintsDataToCsv(complaints: Awaited<ReturnType<typeof prisma.complaint.findMany>> & { sector?: { name: string } | null }[]): string {
  const headers = ["ID", "Category", "Status", "Priority", "CreatedAt", "ResolvedAt", "Sector"];
  const rows = complaints.map((c) => [
    escapeCsvField(String(c.id)),
    escapeCsvField(c.category),
    escapeCsvField(c.status),
    escapeCsvField(c.priority),
    escapeCsvField(c.createdAt.toISOString()),
    escapeCsvField(c.resolvedAt?.toISOString() ?? null),
    escapeCsvField((c as any).sector?.name ?? ""),
  ]);
  return toCsv(headers, rows);
}

function satisfactionDataToCsv(complaints: Awaited<ReturnType<typeof prisma.complaint.findMany>>): string {
  const headers = ["ID", "Category", "Score", "Comment", "RespondedAt"];
  const rows = complaints.map((c) => [
    escapeCsvField(String(c.id)),
    escapeCsvField(c.category),
    escapeCsvField(c.csatScore != null ? String(c.csatScore) : ""),
    escapeCsvField(c.csatComment ?? null),
    escapeCsvField(c.csatRespondedAt?.toISOString() ?? null),
  ]);
  return toCsv(headers, rows);
}

function messagesDataToCsv(messages: Awaited<ReturnType<typeof prisma.message.findMany>>): string {
  const headers = ["ID", "Type", "Scope", "Content", "SentAt", "RecipientCount"];
  const rows = messages.map((m) => [
    escapeCsvField(m.id),
    escapeCsvField(m.type),
    escapeCsvField(m.scope),
    escapeCsvField(m.content),
    escapeCsvField(m.sentAt.toISOString()),
    escapeCsvField(String(m.recipientCount)),
  ]);
  return toCsv(headers, rows);
}

function residentsDataToCsv(residents: Awaited<ReturnType<typeof prisma.resident.findMany>>): string {
  const headers = ["Name", "Phone", "Tower", "Floor", "Unit", "Type"];
  const rows = residents.map((r) => [
    escapeCsvField(r.name),
    escapeCsvField(r.phone),
    escapeCsvField(r.tower),
    escapeCsvField(r.floor),
    escapeCsvField(r.unit),
    escapeCsvField(r.type),
  ]);
  return toCsv(headers, rows);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function getReportsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = request.params as ReportRouteParams;
  const query = request.query as ReportQueryParams;

  const { startDate, endDate, type, format = "json" } = query;

  if (!startDate || !endDate || !type) {
    return reply.status(400).send({
      error: "Bad Request",
      message: "startDate, endDate and type are required query parameters",
    });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return reply.status(400).send({
      error: "Bad Request",
      message: "startDate and endDate must be valid ISO date strings",
    });
  }

  const period = { start: start.toISOString(), end: end.toISOString() };

  if (type === "complaints") {
    const data = await buildComplaintsReport(condominiumId, start, end);
    const { _raw, ...rest } = data;

    if (format === "csv") {
      const csv = complaintsDataToCsv(_raw as any);
      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="report-${type}-${startDate}.csv"`
      );
      return reply.send(csv);
    }

    return reply.send({ period, type, data: rest });
  }

  if (type === "satisfaction") {
    const data = await buildSatisfactionReport(condominiumId, start, end);
    const { _raw, ...rest } = data;

    if (format === "csv") {
      const csv = satisfactionDataToCsv(_raw);
      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="report-${type}-${startDate}.csv"`
      );
      return reply.send(csv);
    }

    return reply.send({ period, type, data: rest });
  }

  if (type === "messages") {
    const data = await buildMessagesReport(condominiumId, start, end);
    const { _raw, ...rest } = data;

    if (format === "csv") {
      const csv = messagesDataToCsv(_raw);
      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="report-${type}-${startDate}.csv"`
      );
      return reply.send(csv);
    }

    return reply.send({ period, type, data: rest });
  }

  if (type === "residents") {
    const data = await buildResidentsReport(condominiumId, start, end);
    const { _raw, ...rest } = data;

    if (format === "csv") {
      const csv = residentsDataToCsv(_raw);
      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="report-${type}-${startDate}.csv"`
      );
      return reply.send(csv);
    }

    return reply.send({ period, type, data: rest });
  }

  return reply.status(400).send({
    error: "Bad Request",
    message:
      "type must be one of: complaints, messages, residents, satisfaction",
  });
}
