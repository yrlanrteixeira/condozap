import { describe, expect, it } from "vitest";
import { ComplaintStatus } from "@prisma/client";
import {
  DEFAULT_SLA_BY_PRIORITY,
  SLA_ACTIONS,
  VALID_TRANSITIONS,
  assertValidTransition,
} from "./complaints.transitions";

describe("complaints.transitions — DEFAULT_SLA_BY_PRIORITY", () => {
  it("defines SLA for every priority", () => {
    for (const priority of ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const) {
      const sla = DEFAULT_SLA_BY_PRIORITY[priority];
      expect(sla.responseMinutes).toBeGreaterThan(0);
      expect(sla.resolutionMinutes).toBeGreaterThan(sla.responseMinutes);
      expect(sla.escalationBuffer).toBeGreaterThan(0);
    }
  });

  it("CRITICAL has tightest SLA", () => {
    expect(DEFAULT_SLA_BY_PRIORITY.CRITICAL.responseMinutes).toBeLessThan(
      DEFAULT_SLA_BY_PRIORITY.LOW.responseMinutes
    );
    expect(DEFAULT_SLA_BY_PRIORITY.CRITICAL.resolutionMinutes).toBeLessThan(
      DEFAULT_SLA_BY_PRIORITY.LOW.resolutionMinutes
    );
  });
});

describe("complaints.transitions — SLA_ACTIONS", () => {
  it("exposes canonical action strings", () => {
    expect(SLA_ACTIONS).toEqual({
      STATUS_CHANGE: "STATUS_CHANGE",
      SLA_PAUSE: "SLA_PAUSE",
      SLA_RESUME: "SLA_RESUME",
      ASSIGNMENT: "ASSIGNMENT",
      ESCALATION: "SLA_ESCALATION",
      COMMENT: "COMMENT",
    });
  });
});

describe("complaints.transitions — VALID_TRANSITIONS", () => {
  it("has an entry for every ComplaintStatus", () => {
    for (const s of Object.values(ComplaintStatus)) {
      expect(VALID_TRANSITIONS[s]).toBeDefined();
    }
  });

  it("CANCELLED is terminal (no outbound)", () => {
    expect(VALID_TRANSITIONS[ComplaintStatus.CANCELLED]).toEqual([]);
  });

  it("CLOSED can only lead to REOPENED", () => {
    expect(VALID_TRANSITIONS[ComplaintStatus.CLOSED]).toEqual([
      ComplaintStatus.REOPENED,
    ]);
  });

  it("RESOLVED can only lead to CLOSED", () => {
    expect(VALID_TRANSITIONS[ComplaintStatus.RESOLVED]).toEqual([
      ComplaintStatus.CLOSED,
    ]);
  });
});

describe("assertValidTransition", () => {
  const happyPaths: Array<[ComplaintStatus, ComplaintStatus]> = [
    [ComplaintStatus.OPEN, ComplaintStatus.TRIAGE],
    [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS],
    [ComplaintStatus.OPEN, ComplaintStatus.CANCELLED],
    [ComplaintStatus.NEW, ComplaintStatus.TRIAGE],
    [ComplaintStatus.NEW, ComplaintStatus.IN_PROGRESS],
    [ComplaintStatus.NEW, ComplaintStatus.CANCELLED],
    [ComplaintStatus.TRIAGE, ComplaintStatus.IN_PROGRESS],
    [ComplaintStatus.TRIAGE, ComplaintStatus.CANCELLED],
    [ComplaintStatus.TRIAGE, ComplaintStatus.RETURNED],
    [ComplaintStatus.IN_PROGRESS, ComplaintStatus.WAITING_USER],
    [ComplaintStatus.IN_PROGRESS, ComplaintStatus.WAITING_THIRD_PARTY],
    [ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED],
    [ComplaintStatus.IN_PROGRESS, ComplaintStatus.CANCELLED],
    [ComplaintStatus.IN_PROGRESS, ComplaintStatus.RETURNED],
    [ComplaintStatus.WAITING_USER, ComplaintStatus.IN_PROGRESS],
    [ComplaintStatus.WAITING_THIRD_PARTY, ComplaintStatus.IN_PROGRESS],
    [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED],
    [ComplaintStatus.CLOSED, ComplaintStatus.REOPENED],
    [ComplaintStatus.RETURNED, ComplaintStatus.IN_PROGRESS],
    [ComplaintStatus.REOPENED, ComplaintStatus.IN_PROGRESS],
    [ComplaintStatus.REOPENED, ComplaintStatus.CANCELLED],
  ];

  it.each(happyPaths)("allows %s → %s", (from, to) => {
    expect(() => assertValidTransition(from, to)).not.toThrow();
  });

  const invalidPaths: Array<[ComplaintStatus, ComplaintStatus]> = [
    [ComplaintStatus.CANCELLED, ComplaintStatus.IN_PROGRESS],
    [ComplaintStatus.CANCELLED, ComplaintStatus.REOPENED],
    [ComplaintStatus.RESOLVED, ComplaintStatus.IN_PROGRESS],
    [ComplaintStatus.CLOSED, ComplaintStatus.IN_PROGRESS],
    [ComplaintStatus.OPEN, ComplaintStatus.RESOLVED],
    [ComplaintStatus.NEW, ComplaintStatus.CLOSED],
    [ComplaintStatus.TRIAGE, ComplaintStatus.RESOLVED],
    [ComplaintStatus.WAITING_USER, ComplaintStatus.RESOLVED],
    [ComplaintStatus.RETURNED, ComplaintStatus.CLOSED],
    [ComplaintStatus.REOPENED, ComplaintStatus.RESOLVED],
  ];

  it.each(invalidPaths)("rejects %s → %s", (from, to) => {
    expect(() => assertValidTransition(from, to)).toThrow(
      /não é permitida/i
    );
  });

  it("throws BadRequestError with descriptive message", () => {
    expect(() =>
      assertValidTransition(
        ComplaintStatus.CANCELLED,
        ComplaintStatus.IN_PROGRESS
      )
    ).toThrow(/CANCELLED.*IN_PROGRESS/);
  });

  it("handles unknown source status via falsy fallback", () => {
    // Reach the `|| []` branch by passing a non-existent status (cast).
    expect(() =>
      assertValidTransition(
        "__ghost__" as ComplaintStatus,
        ComplaintStatus.IN_PROGRESS
      )
    ).toThrow(/não é permitida/i);
  });
});
