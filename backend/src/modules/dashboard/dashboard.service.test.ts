import { describe, expect, it } from "vitest";
import {
  buildMetrics,
  buildUnifiedDashboard,
  parseCondominiumIds,
} from "./dashboard.service";

describe("dashboard.service — parseCondominiumIds", () => {
  it("splits comma-separated ids and trims whitespace", () => {
    expect(parseCondominiumIds("a, b ,c")).toEqual(["a", "b", "c"]);
  });

  it("filters out empty strings", () => {
    expect(parseCondominiumIds(",,a,,")).toEqual(["a"]);
  });

  it("returns empty array on empty input", () => {
    expect(parseCondominiumIds("")).toEqual([]);
  });
});

describe("dashboard.service — buildMetrics", () => {
  it("returns zeroed structure on empty inputs", () => {
    const m = buildMetrics([], [], []);
    expect(m.complaints.total).toBe(0);
    expect(m.residents.total).toBe(0);
    expect(m.messages.totalSent).toBe(0);
    expect(m.messages.deliveryRate).toBe(0);
  });

  it("aggregates complaints by priority, status, category, tower", () => {
    const now = new Date();
    const m = buildMetrics(
      [
        {
          status: "NEW",
          priority: "HIGH",
          category: "barulho",
          createdAt: now,
          resident: { tower: "A" },
        },
        {
          status: "IN_PROGRESS",
          priority: "LOW",
          category: "barulho",
          createdAt: now,
          resident: { tower: "B" },
        },
        {
          status: "RESOLVED",
          priority: "CRITICAL",
          category: "seguranca",
          createdAt: now,
          resident: { tower: null },
        },
      ],
      [],
      []
    );
    expect(m.complaints.total).toBe(3);
    expect(m.complaints.open).toBe(1);
    expect(m.complaints.inProgress).toBe(1);
    expect(m.complaints.resolved).toBe(1);
    expect(m.complaints.byPriority.HIGH).toBe(1);
    expect(m.complaints.byPriority.CRITICAL).toBe(1);
    expect(m.complaints.byCategory.barulho).toBe(2);
    expect(m.complaints.byTower["Sem Torre"]).toBe(1);
    expect(m.complaints.byTower.A).toBe(1);
  });

  it("computes delivery rate and message breakdowns", () => {
    const sentAt = new Date();
    const m = buildMetrics(
      [],
      [],
      [
        { whatsappStatus: "DELIVERED", recipientCount: 2, sentAt },
        { whatsappStatus: "READ", recipientCount: 3, sentAt },
        { whatsappStatus: "FAILED", recipientCount: 1, sentAt },
        { whatsappStatus: "PENDING", recipientCount: null, sentAt },
      ]
    );
    expect(m.messages.totalSent).toBe(4);
    expect(m.messages.delivered).toBe(2);
    expect(m.messages.read).toBe(1);
    expect(m.messages.failed).toBe(1);
    expect(m.messages.totalRecipients).toBe(6);
    expect(m.messages.deliveryRate).toBe(50);
  });

  it("groups residents by consent and type", () => {
    const m = buildMetrics(
      [],
      [
        { tower: "A", type: "OWNER", consentWhatsapp: true },
        { tower: "A", type: "TENANT", consentWhatsapp: false },
        { tower: null, type: "OWNER", consentWhatsapp: true },
      ],
      []
    );
    expect(m.residents.total).toBe(3);
    expect(m.residents.withConsent).toBe(2);
    expect(m.residents.byType.owner).toBe(2);
    expect(m.residents.byType.tenant).toBe(1);
    expect(m.residents.byTower.A).toBe(2);
    expect(m.residents.byTower["Sem Torre"]).toBe(1);
  });
});

describe("dashboard.service — buildUnifiedDashboard", () => {
  it("returns counts + critical/high urgentFeed truncated", () => {
    const condos = [
      { id: "c1", name: "Condo 1" },
      { id: "c2", name: "Condo 2" },
    ];
    const complaints = [
      {
        id: 1,
        condominiumId: "c1",
        category: "barulho",
        content: "x".repeat(200),
        status: "NEW",
        priority: "CRITICAL",
        createdAt: new Date(),
        resident: { name: "R" },
        condominium: { name: "Condo 1" },
      },
      {
        id: 2,
        condominiumId: "c2",
        category: "infra",
        content: "ok",
        status: "IN_PROGRESS",
        priority: "HIGH",
        createdAt: new Date(),
        resident: { name: "R2" },
        condominium: { name: "Condo 2" },
      },
      {
        id: 3,
        condominiumId: "c2",
        category: "low",
        content: "ok",
        status: "NEW",
        priority: "LOW",
        createdAt: new Date(),
        resident: { name: "R3" },
        condominium: { name: "Condo 2" },
      },
    ];
    const d = buildUnifiedDashboard(condos, complaints);
    expect(d.totalCondos).toBe(2);
    expect(d.totalComplaints).toBe(3);
    expect(d.criticalComplaints).toBe(1);
    expect(d.openComplaints).toBe(2);
    expect(d.inProgressComplaints).toBe(1);
    expect(d.urgentFeed).toHaveLength(2);
    expect(d.urgentFeed[0].description.endsWith("...")).toBe(true);
    expect(d.complaintsByCondo).toHaveLength(2);
    expect(d.complaintsByCondo.find((c) => c.id === "c2")?.total).toBe(2);
  });
});
