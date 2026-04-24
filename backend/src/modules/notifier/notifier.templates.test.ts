import { describe, expect, it } from "vitest";
import { buildTemplate } from "./notifier.templates";

describe("notifier.templates — buildTemplate", () => {
  it("builds complaint_created template", () => {
    const t = buildTemplate({
      type: "complaint_created",
      complaintId: 42,
      residentPhone: "+55",
      residentName: "João",
      category: "barulho",
    });
    expect(t.whatsappMessage).toContain("#42");
    expect(t.whatsappMessage).toContain("barulho");
    expect(t.inAppType).toBe("complaint_status");
    expect(t.inAppTitle).toBe("Ocorrência registrada");
  });

  it("builds complaint_status_changed with labels", () => {
    const t = buildTemplate({
      type: "complaint_status_changed",
      complaintId: 7,
      residentPhone: "+55",
      residentName: "X",
      newStatus: "RESOLVED",
      oldStatus: "IN_PROGRESS",
    });
    expect(t.inAppBody).toContain("Em Andamento");
    expect(t.inAppBody).toContain("Resolvida");
    expect(t.inAppType).toBe("complaint_status");
  });

  it("builds complaint_assigned template with priority label", () => {
    const t = buildTemplate({
      type: "complaint_assigned",
      complaintId: 1,
      assigneePhone: "+55",
      assigneeName: "X",
      category: "infra",
      priority: "CRITICAL",
    });
    expect(t.whatsappMessage).toContain("Crítica");
    expect(t.inAppType).toBe("complaint_assigned");
  });

  it("builds complaint_comment template", () => {
    const t = buildTemplate({
      type: "complaint_comment",
      complaintId: 9,
      recipientPhone: "+55",
      recipientName: "X",
      authorName: "Maria",
    });
    expect(t.inAppBody).toContain("Maria");
    expect(t.inAppType).toBe("complaint_comment");
  });

  it("builds sla_warning template (response)", () => {
    const t = buildTemplate({
      type: "sla_warning",
      complaintId: 3,
      syndicPhone: "+55",
      syndicName: "X",
      minutesRemaining: 30,
      slaType: "response",
    });
    expect(t.whatsappMessage).toContain("resposta");
    expect(t.whatsappMessage).toContain("30");
  });

  it("builds sla_warning template (resolution)", () => {
    const t = buildTemplate({
      type: "sla_warning",
      complaintId: 3,
      syndicPhone: "+55",
      syndicName: "X",
      minutesRemaining: 10,
      slaType: "resolution",
    });
    expect(t.whatsappMessage).toContain("resolução");
  });

  it("builds sla_escalation template", () => {
    const t = buildTemplate({
      type: "sla_escalation",
      complaintId: 8,
      syndicPhone: "+55",
      syndicName: "X",
      category: "infra",
      priority: "HIGH",
    });
    expect(t.whatsappMessage).toContain("SLA violado");
    expect(t.whatsappMessage).toContain("Alta");
  });

  it("builds csat_request template", () => {
    const t = buildTemplate({
      type: "csat_request",
      complaintId: 5,
      residentPhone: "+55",
      residentName: "X",
    });
    expect(t.whatsappMessage).toContain("1-5");
    expect(t.inAppType).toBe("csat_request");
  });

  it("builds approval_pending template", () => {
    const t = buildTemplate({
      type: "approval_pending",
      userName: "João",
      syndicPhone: "+55",
      condominiumName: "Condo 1",
    });
    expect(t.inAppBody).toContain("João");
    expect(t.inAppBody).toContain("Condo 1");
  });
});
