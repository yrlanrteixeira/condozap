import { describe, expect, it } from "vitest";
import { ComplaintStatus } from "@prisma/client";
import { setupIntegrationSuite } from "../../../test/helpers/build-test-app";
import { getTestPrisma } from "../../../test/helpers/db";
import {
  makeComplaint,
  makeCondominium,
  makeResident,
  makeSector,
} from "../../../test/factories";
import { classifyComplaint, evaluateWorkflows } from "./automation.engine";

setupIntegrationSuite();

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);
const minsAhead = (n: number) => new Date(Date.now() + n * 60_000);
const minsAgo = (n: number) => new Date(Date.now() - n * 60_000);

describe("automation.engine — classifyComplaint", () => {
  it("matches by exact category (confidence=high)", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const sec = await makeSector({ condominiumId: condo.id });
    // extend categories to include "manutencao"
    await prisma.sector.update({
      where: { id: sec.id },
      data: { categories: ["manutencao", "limpeza"] },
    });

    const result = await classifyComplaint(prisma, {
      condominiumId: condo.id,
      category: "manutencao",
      content: "sem keyword",
    });
    expect(result.sectorId).toBe(sec.id);
    expect(result.confidence).toBe("high");
    expect(result.matchedBy).toBe("category");
  });

  it("falls back to keyword match (confidence=medium)", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const sec = await makeSector({ condominiumId: condo.id });
    await prisma.sector.update({
      where: { id: sec.id },
      data: { categories: ["portaria"] },
    });

    const result = await classifyComplaint(prisma, {
      condominiumId: condo.id,
      category: "nada",
      content: "problema na portaria hoje",
    });
    expect(result.sectorId).toBe(sec.id);
    expect(result.matchedBy).toBe("keyword");
  });

  it("returns null sectorId when no match (confidence=low)", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();

    const result = await classifyComplaint(prisma, {
      condominiumId: condo.id,
      category: "x",
      content: "nada relevante",
    });
    expect(result.sectorId).toBeNull();
    expect(result.confidence).toBe("low");
  });

  it("attaches suggestedPriority from keywords", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const result = await classifyComplaint(prisma, {
      condominiumId: condo.id,
      category: "x",
      content: "vazamento urgente no 3o andar",
    });
    expect(result.suggestedPriority).toBe("CRITICAL");
  });
});

describe("automation.engine — evaluateWorkflows", () => {
  it("returns empty array when nothing matches", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    // fresh RESOLVED complaint shouldn't trigger auto_close yet
    await makeComplaint({
      condominiumId: condo.id,
      status: ComplaintStatus.RESOLVED,
    });

    const actions = await evaluateWorkflows(prisma, condo.id);
    const autoClose = actions.filter((a) => a.type === "auto_close");
    expect(autoClose).toHaveLength(0);
  });

  it("emits auto_close for complaints resolved past autoCloseAfterDays", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    await prisma.condominium.update({
      where: { id: condo.id },
      data: { autoCloseAfterDays: 1 },
    });
    const resident = await makeResident({ condominiumId: condo.id });
    const c = await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      status: ComplaintStatus.RESOLVED,
    });
    // Backdate resolvedAt
    await prisma.complaint.update({
      where: { id: c.id },
      data: { resolvedAt: daysAgo(3) },
    });

    const actions = await evaluateWorkflows(prisma, condo.id);
    const found = actions.find(
      (a) => a.type === "auto_close" && a.complaintId === c.id
    );
    expect(found).toBeDefined();
  });

  it("emits auto_resolve for WAITING_USER complaints past waitingAutoResolveDays", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    await prisma.condominium.update({
      where: { id: condo.id },
      data: { waitingAutoResolveDays: 1 },
    });
    const c = await makeComplaint({
      condominiumId: condo.id,
      status: ComplaintStatus.WAITING_USER,
    });
    await prisma.complaint.update({
      where: { id: c.id },
      data: { updatedAt: daysAgo(3) },
    });

    const actions = await evaluateWorkflows(prisma, condo.id);
    const found = actions.find(
      (a) => a.type === "auto_resolve" && a.complaintId === c.id
    );
    expect(found).toBeDefined();
  });

  it("emits send_reminder when response SLA is near breach (<30 min)", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const c = await makeComplaint({
      condominiumId: condo.id,
      status: ComplaintStatus.NEW,
    });
    await prisma.complaint.update({
      where: { id: c.id },
      data: { responseDueAt: minsAhead(15), escalatedAt: null },
    });

    const actions = await evaluateWorkflows(prisma, condo.id);
    const found = actions.find(
      (a) => a.type === "send_reminder" && a.complaintId === c.id
    );
    expect(found).toBeDefined();
  });

  it("emits escalate action when response SLA is breached", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const c = await makeComplaint({
      condominiumId: condo.id,
      status: ComplaintStatus.NEW,
    });
    await prisma.complaint.update({
      where: { id: c.id },
      data: { responseDueAt: minsAgo(10), escalatedAt: null },
    });

    const actions = await evaluateWorkflows(prisma, condo.id);
    const found = actions.find(
      (a) => a.type === "escalate" && a.complaintId === c.id
    );
    expect(found).toBeDefined();
  });

  it("respects the condominiumId scope filter", async () => {
    const prisma = getTestPrisma();
    const condoA = await makeCondominium();
    const condoB = await makeCondominium();
    await prisma.condominium.update({
      where: { id: condoA.id },
      data: { autoCloseAfterDays: 1 },
    });
    const cA = await makeComplaint({
      condominiumId: condoA.id,
      status: ComplaintStatus.RESOLVED,
    });
    await prisma.complaint.update({
      where: { id: cA.id },
      data: { resolvedAt: daysAgo(3) },
    });

    const actionsB = await evaluateWorkflows(prisma, condoB.id);
    expect(actionsB.find((a) => a.complaintId === cA.id)).toBeUndefined();
  });
});
