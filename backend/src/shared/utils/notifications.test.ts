import { describe, expect, it } from "vitest";
import {
  buildComplaintCommentMessage,
  buildComplaintCreatedMessage,
  buildComplaintPriorityMessage,
  buildComplaintStatusMessage,
} from "./notifications";

describe("buildComplaintCreatedMessage", () => {
  it("includes protocol, category, priority label and emoji", () => {
    const msg = buildComplaintCreatedMessage("Alice", 42, "Manutenção", "HIGH");
    expect(msg).toContain("Alice");
    expect(msg).toContain("#42");
    expect(msg).toContain("Manutenção");
    expect(msg).toContain("Alta");
    expect(msg).toContain("🟠");
  });

  it("falls back to Média/🟡 for unknown priority", () => {
    const msg = buildComplaintCreatedMessage("Bob", 1, "Cat", "UNKNOWN");
    expect(msg).toContain("Média");
    expect(msg).toContain("🟡");
  });

  it("uses CRITICAL mapping", () => {
    const msg = buildComplaintCreatedMessage("x", 1, "c", "CRITICAL");
    expect(msg).toContain("Crítica");
    expect(msg).toContain("🔴");
  });
});

describe("buildComplaintStatusMessage", () => {
  it("renders status emoji + label and omits observation when not provided", () => {
    const msg = buildComplaintStatusMessage("A", 9, "Cat", "IN_PROGRESS");
    expect(msg).toContain("#9");
    expect(msg).toContain("Em Andamento");
    expect(msg).toContain("🟡");
    expect(msg).not.toContain("Observação");
  });

  it("appends observation when notes are provided", () => {
    const msg = buildComplaintStatusMessage("A", 1, "c", "NEW", "ok");
    expect(msg).toContain("Observação");
    expect(msg).toContain("ok");
    expect(msg).toContain("🔵");
  });

  it("adds thank-you footer when RESOLVED", () => {
    const msg = buildComplaintStatusMessage("A", 1, "c", "RESOLVED");
    expect(msg).toContain("resolvida");
    expect(msg).toContain("✅");
  });

  it("falls back to raw status for unknown values", () => {
    const msg = buildComplaintStatusMessage("A", 1, "c", "WHATEVER");
    expect(msg).toContain("WHATEVER");
  });
});

describe("buildComplaintPriorityMessage", () => {
  it("formats priority with emoji label", () => {
    expect(buildComplaintPriorityMessage("A", 5, "HIGH")).toContain("🟠 Alta");
    expect(buildComplaintPriorityMessage("A", 5, "LOW")).toContain("🟢 Baixa");
    expect(buildComplaintPriorityMessage("A", 5, "MEDIUM")).toContain("🟡 Média");
    expect(buildComplaintPriorityMessage("A", 5, "CRITICAL")).toContain("🔴 Crítica");
  });

  it("falls back to raw label for unknown priority", () => {
    expect(buildComplaintPriorityMessage("A", 5, "ZZZ")).toContain("ZZZ");
  });
});

describe("buildComplaintCommentMessage", () => {
  it("uses 'Síndico' label for SYNDIC role", () => {
    const msg = buildComplaintCommentMessage("A", 1, "SYNDIC", "oi");
    expect(msg).toContain("Síndico");
    expect(msg).toContain("oi");
  });

  it("uses 'Administrador' label for ADMIN role", () => {
    expect(buildComplaintCommentMessage("A", 1, "ADMIN", "x")).toContain(
      "Administrador"
    );
  });

  it("uses 'Responsável' fallback for other roles", () => {
    expect(buildComplaintCommentMessage("A", 1, "RESIDENT", "x")).toContain(
      "Responsável"
    );
  });
});
