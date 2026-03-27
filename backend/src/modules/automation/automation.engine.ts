import type { PrismaClient } from "@prisma/client";
import type { TriageDecision, WorkflowAction } from "./automation.types";
import { detectPriority } from "./keywords";

export async function classifyComplaint(
  prisma: PrismaClient,
  data: { condominiumId: string; category: string; content: string }
): Promise<TriageDecision> {
  const sectors = await prisma.sector.findMany({
    where: { condominiumId: data.condominiumId },
    select: { id: true, name: true, categories: true },
  });

  // 1. Exact category match
  for (const sector of sectors) {
    if (sector.categories.some((c) => c.toLowerCase() === data.category.toLowerCase())) {
      return {
        sectorId: sector.id,
        confidence: "high",
        matchedBy: "category",
        suggestedPriority: detectPriority(data.content),
      };
    }
  }

  // 2. Keyword match in content
  const lower = data.content.toLowerCase();
  for (const sector of sectors) {
    for (const cat of sector.categories) {
      if (lower.includes(cat.toLowerCase())) {
        return {
          sectorId: sector.id,
          confidence: "medium",
          matchedBy: "keyword",
          suggestedPriority: detectPriority(data.content),
        };
      }
    }
  }

  // 3. No match
  return {
    sectorId: null,
    confidence: "low",
    matchedBy: "none",
    suggestedPriority: detectPriority(data.content),
  };
}

export async function evaluateWorkflows(
  prisma: PrismaClient,
  condominiumId?: string
): Promise<WorkflowAction[]> {
  const actions: WorkflowAction[] = [];
  const now = new Date();
  const condoFilter = condominiumId ? { condominiumId } : {};

  // Get automation settings per condominium
  const condos = await prisma.condominium.findMany({
    where: condominiumId ? { id: condominiumId } : undefined,
    select: { id: true, autoCloseAfterDays: true, waitingAutoResolveDays: true },
  });
  const settings = new Map(condos.map((c) => [c.id, c]));

  // 1. Auto-close resolved complaints
  const resolved = await prisma.complaint.findMany({
    where: { ...condoFilter, status: "RESOLVED", resolvedAt: { not: null } },
    select: { id: true, condominiumId: true, resolvedAt: true },
  });
  for (const c of resolved) {
    const s = settings.get(c.condominiumId);
    if (!s || !c.resolvedAt) continue;
    if (now.getTime() > c.resolvedAt.getTime() + s.autoCloseAfterDays * 86400000) {
      actions.push({
        type: "auto_close",
        complaintId: c.id,
        reason: `Auto-fechada após ${s.autoCloseAfterDays} dias sem reabertura`,
        payload: {},
      });
    }
  }

  // 2. Auto-resolve waiting complaints
  const waiting = await prisma.complaint.findMany({
    where: { ...condoFilter, status: "WAITING_USER" },
    select: { id: true, condominiumId: true, updatedAt: true },
  });
  for (const c of waiting) {
    const s = settings.get(c.condominiumId);
    if (!s) continue;
    if (now.getTime() > c.updatedAt.getTime() + s.waitingAutoResolveDays * 86400000) {
      actions.push({
        type: "auto_resolve",
        complaintId: c.id,
        reason: `Auto-resolvida: morador não respondeu em ${s.waitingAutoResolveDays} dias`,
        payload: {},
      });
    }
  }

  // 3. SLA warnings and breaches
  const active = await prisma.complaint.findMany({
    where: {
      ...condoFilter,
      status: { in: ["NEW", "TRIAGE", "IN_PROGRESS"] },
      escalatedAt: null,
    },
    select: { id: true, responseDueAt: true, resolutionDueAt: true, responseAt: true, status: true },
  });

  for (const c of active) {
    if (c.responseDueAt && !c.responseAt) {
      const warn = new Date(c.responseDueAt.getTime() - 30 * 60000);
      if (now > warn && now < c.responseDueAt) {
        actions.push({
          type: "send_reminder",
          complaintId: c.id,
          reason: `SLA de resposta vence em ${Math.round((c.responseDueAt.getTime() - now.getTime()) / 60000)} minutos`,
          payload: {
            slaType: "response",
            minutesRemaining: Math.round((c.responseDueAt.getTime() - now.getTime()) / 60000),
          },
        });
      }
      if (now > c.responseDueAt) {
        actions.push({
          type: "escalate",
          complaintId: c.id,
          reason: "SLA de resposta violado",
          payload: { slaType: "response" },
        });
      }
    }
    if (c.resolutionDueAt && c.status === "IN_PROGRESS") {
      const warn = new Date(c.resolutionDueAt.getTime() - 60 * 60000);
      if (now > warn && now < c.resolutionDueAt) {
        actions.push({
          type: "send_reminder",
          complaintId: c.id,
          reason: `SLA de resolução vence em ${Math.round((c.resolutionDueAt.getTime() - now.getTime()) / 60000)} minutos`,
          payload: {
            slaType: "resolution",
            minutesRemaining: Math.round((c.resolutionDueAt.getTime() - now.getTime()) / 60000),
          },
        });
      }
      if (now > c.resolutionDueAt) {
        actions.push({
          type: "escalate",
          complaintId: c.id,
          reason: "SLA de resolução violado",
          payload: { slaType: "resolution" },
        });
      }
    }
  }

  return actions;
}
