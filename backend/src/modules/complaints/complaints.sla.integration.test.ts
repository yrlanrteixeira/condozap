/**
 * Integration-level tests for complaints.sla.ts — uses real Prisma because
 * functions here are repository-driven (findSlaConfig, resolveAssignee,
 * runSlaEscalationScan). Also covers the pure `addMinutes` helper.
 */
import { ComplaintPriority, ComplaintStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { setupIntegrationSuite } from "../../../test/helpers/build-test-app";
import { getTestPrisma } from "../../../test/helpers/db";
import {
  makeCondominium,
  makeResident,
  makeSector,
  makeUser,
  makeComplaint,
} from "../../../test/factories";
import {
  addMinutes,
  findSlaConfig,
  resolveAssignee,
  runSlaEscalationScan,
} from "./complaints.sla";
import { DEFAULT_SLA_BY_PRIORITY } from "./complaints.transitions";

setupIntegrationSuite();

const silentLogger: any = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

/**
 * Production's `runSlaEscalationScan` stamps `assignedBy: "system"` on the
 * assignment it creates. That column is a real FK to `users.id`, so the write
 * only succeeds when a user with id "system" exists in the DB. We treat that
 * as a deployment invariant (would be seeded in prod) and reproduce it here.
 */
async function ensureSystemUser() {
  const p = getTestPrisma();
  const existing = await p.user.findUnique({ where: { id: "system" } });
  if (existing) return existing;
  return p.user.create({
    data: {
      id: "system",
      email: "system@condozap.local",
      name: "System",
      password: await bcrypt.hash("system", 4),
      role: UserRole.SUPER_ADMIN,
    },
  });
}

describe("addMinutes", () => {
  it("adds positive minutes", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    expect(addMinutes(d, 30).toISOString()).toBe("2026-01-01T00:30:00.000Z");
  });
  it("subtracts with negative minutes", () => {
    const d = new Date("2026-01-01T01:00:00Z");
    expect(addMinutes(d, -30).toISOString()).toBe("2026-01-01T00:30:00.000Z");
  });
  it("does not mutate original date", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    addMinutes(d, 30);
    expect(d.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("findSlaConfig", () => {
  it("returns DB config when present", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    await p.slaConfig.create({
      data: {
        condominiumId: condo.id,
        priority: ComplaintPriority.HIGH,
        responseMinutes: 5,
        resolutionMinutes: 99,
        escalationBufferMinutes: 3,
      },
    });
    const cfg = await findSlaConfig(p, condo.id, ComplaintPriority.HIGH);
    expect(cfg).toEqual({
      responseMinutes: 5,
      resolutionMinutes: 99,
      escalationBuffer: 3,
    });
  });

  it("falls back to default by priority when no DB record", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    for (const priority of [
      ComplaintPriority.CRITICAL,
      ComplaintPriority.HIGH,
      ComplaintPriority.MEDIUM,
      ComplaintPriority.LOW,
    ]) {
      const cfg = await findSlaConfig(p, condo.id, priority);
      expect(cfg).toEqual(DEFAULT_SLA_BY_PRIORITY[priority]);
    }
  });
});

describe("resolveAssignee", () => {
  it("returns explicit assignee when active and increments workload", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const user = await makeUser({ role: UserRole.SETOR_MEMBER });
    const sm = await p.sectorMember.create({
      data: { sectorId: sector.id, userId: user.id, isActive: true, workload: 0 },
    });
    const result = await resolveAssignee(p, sector.id, user.id);
    expect(result).toBe(user.id);
    const updated = await p.sectorMember.findUnique({ where: { id: sm.id } });
    expect(updated?.workload).toBe(1);
  });

  it("throws when explicit assignee not a sector member", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const ghost = await makeUser();
    await expect(resolveAssignee(p, sector.id, ghost.id)).rejects.toThrow(
      /not active in sector/i
    );
  });

  it("picks lowest-workload active member when no explicit assignee", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const a = await makeUser({ role: UserRole.SETOR_MEMBER });
    const b = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: a.id, isActive: true, workload: 5 },
    });
    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: b.id, isActive: true, workload: 1 },
    });
    const chosen = await resolveAssignee(p, sector.id);
    expect(chosen).toBe(b.id);
  });

  it("returns null when sector has no active members", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const u = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: u.id, isActive: false, workload: 0 },
    });
    const chosen = await resolveAssignee(p, sector.id);
    expect(chosen).toBeNull();
  });
});

describe("runSlaEscalationScan", () => {
  it("returns processed: 0 when no complaints exist", async () => {
    const p = getTestPrisma();
    const result = await runSlaEscalationScan(p, silentLogger);
    expect(result).toEqual({ processed: 0 });
  });

  it("ignores complaints that are not overdue", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const resident = await makeResident({ condominiumId: condo.id });
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const c = await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      status: ComplaintStatus.IN_PROGRESS,
      priority: ComplaintPriority.CRITICAL,
    });
    await p.complaint.update({
      where: { id: c.id },
      data: { responseDueAt: future, resolutionDueAt: future, responseAt: null },
    });
    const result = await runSlaEscalationScan(p, silentLogger, condo.id);
    expect(result.processed).toBe(0);
  });

  it("escalates overdue complaints with a syndic present and records history + assignment", async () => {
    const p = getTestPrisma();
    await ensureSystemUser();
    const condo = await makeCondominium();
    const syndicUser = await makeUser({ role: UserRole.SYNDIC });
    await p.userCondominium.create({
      data: {
        userId: syndicUser.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const sector = await makeSector({ condominiumId: condo.id });
    const resident = await makeResident({ condominiumId: condo.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      sectorId: sector.id,
      status: ComplaintStatus.IN_PROGRESS,
      priority: ComplaintPriority.CRITICAL,
    });
    await p.complaint.update({
      where: { id: complaint.id },
      data: { responseDueAt: past, resolutionDueAt: past, responseAt: null },
    });

    const result = await runSlaEscalationScan(p, silentLogger, condo.id);
    expect(result.processed).toBe(1);

    const updated = await p.complaint.findUnique({ where: { id: complaint.id } });
    expect(updated?.escalatedAt).not.toBeNull();
    expect(updated?.escalationTargetId).toBe(syndicUser.id);
    expect(updated?.assigneeId).toBe(syndicUser.id);
    expect(updated?.status).toBe(ComplaintStatus.IN_PROGRESS);

    const history = await p.complaintStatusHistory.findMany({
      where: { complaintId: complaint.id, action: "SLA_ESCALATION" },
    });
    expect(history.length).toBe(1);

    const assignments = await p.complaintAssignment.findMany({
      where: { complaintId: complaint.id },
    });
    expect(assignments.length).toBe(1);
    expect(assignments[0].assignedBy).toBe("system");
  });

  it("skips complaints still within escalation buffer", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const resident = await makeResident({ condominiumId: condo.id });
    const within = new Date(Date.now() - 5 * 60 * 1000);
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      priority: ComplaintPriority.CRITICAL,
      status: ComplaintStatus.IN_PROGRESS,
    });
    await p.complaint.update({
      where: { id: complaint.id },
      data: { responseDueAt: within, resolutionDueAt: within, responseAt: null },
    });

    const result = await runSlaEscalationScan(p, silentLogger, condo.id);
    expect(result.processed).toBe(1);
    const untouched = await p.complaint.findUnique({
      where: { id: complaint.id },
    });
    expect(untouched?.escalatedAt).toBeNull();
  });

  it("escalates without sector (no assignment record) when sectorId is null", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const syndicUser = await makeUser({ role: UserRole.SYNDIC });
    await p.userCondominium.create({
      data: {
        userId: syndicUser.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const resident = await makeResident({ condominiumId: condo.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      sectorId: null,
      priority: ComplaintPriority.CRITICAL,
      status: ComplaintStatus.IN_PROGRESS,
    });
    await p.complaint.update({
      where: { id: complaint.id },
      data: { responseDueAt: past, resolutionDueAt: past, responseAt: null },
    });

    const result = await runSlaEscalationScan(p, silentLogger, condo.id);
    expect(result.processed).toBe(1);
    const assignments = await p.complaintAssignment.findMany({
      where: { complaintId: complaint.id },
    });
    expect(assignments.length).toBe(0);
  });

  it("handles missing syndic by leaving escalationTargetId null", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const resident = await makeResident({ condominiumId: condo.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      priority: ComplaintPriority.CRITICAL,
      status: ComplaintStatus.IN_PROGRESS,
    });
    await p.complaint.update({
      where: { id: complaint.id },
      data: { responseDueAt: past, resolutionDueAt: past, responseAt: null },
    });

    const result = await runSlaEscalationScan(p, silentLogger, condo.id);
    expect(result.processed).toBe(1);
    const updated = await p.complaint.findUnique({
      where: { id: complaint.id },
    });
    expect(updated?.escalatedAt).not.toBeNull();
    expect(updated?.escalationTargetId).toBeNull();
  });

  it("scans all condominiums when condominiumId is omitted", async () => {
    const p = getTestPrisma();
    const c1 = await makeCondominium();
    const c2 = await makeCondominium();
    const r1 = await makeResident({ condominiumId: c1.id });
    const r2 = await makeResident({ condominiumId: c2.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    for (const [cid, rid] of [
      [c1.id, r1.id],
      [c2.id, r2.id],
    ] as const) {
      const c = await makeComplaint({
        condominiumId: cid,
        residentId: rid,
        status: ComplaintStatus.IN_PROGRESS,
        priority: ComplaintPriority.CRITICAL,
      });
      await p.complaint.update({
        where: { id: c.id },
        data: { responseDueAt: past, resolutionDueAt: past, responseAt: null },
      });
    }
    const result = await runSlaEscalationScan(p, silentLogger);
    expect(result.processed).toBe(2);
  });
});
