import { describe, expect, it } from "vitest";
import {
  addAttachmentSchema,
  addCommentSchema,
  assignComplaintSchema,
  complaintFiltersSchema,
  complaintIdParamSchema,
  complaintStatsQuerySchema,
  condominiumIdParamSchema,
  createComplaintSchema,
  pauseSlaSchema,
  priorityEnum,
  resumeSlaSchema,
  statusEnum,
  updateComplaintSchema,
  updatePrioritySchema,
  updateStatusSchema,
} from "./complaints.schema";

describe("priorityEnum / statusEnum", () => {
  it("accepts each valid priority", () => {
    for (const v of ["CRITICAL", "HIGH", "MEDIUM", "LOW"]) {
      expect(priorityEnum.parse(v)).toBe(v);
    }
  });

  it("rejects unknown priority", () => {
    expect(() => priorityEnum.parse("URGENT")).toThrow();
  });

  it("accepts each valid status", () => {
    for (const v of [
      "OPEN",
      "NEW",
      "TRIAGE",
      "IN_PROGRESS",
      "WAITING_USER",
      "WAITING_THIRD_PARTY",
      "RESOLVED",
      "CLOSED",
      "CANCELLED",
      "RETURNED",
      "REOPENED",
    ]) {
      expect(statusEnum.parse(v)).toBe(v);
    }
  });

  it("rejects unknown status", () => {
    expect(() => statusEnum.parse("FOO")).toThrow();
  });
});

describe("createComplaintSchema", () => {
  const base = {
    condominiumId: "c1",
    residentId: "r1",
    category: "manutencao",
    content: "corredor sem luz no 3o andar",
  };

  it("parses minimal valid payload and applies defaults", () => {
    const parsed = createComplaintSchema.parse(base);
    expect(parsed.priority).toBe("MEDIUM");
    expect(parsed.isAnonymous).toBe(false);
    expect(parsed.attachments).toEqual([]);
  });

  it("rejects short category", () => {
    expect(() => createComplaintSchema.parse({ ...base, category: "ab" })).toThrow();
  });

  it("rejects short content", () => {
    expect(() => createComplaintSchema.parse({ ...base, content: "curto" })).toThrow();
  });

  it("rejects empty condominiumId/residentId", () => {
    expect(() => createComplaintSchema.parse({ ...base, condominiumId: "" })).toThrow();
    expect(() => createComplaintSchema.parse({ ...base, residentId: "" })).toThrow();
  });

  it("accepts idempotencyKey within bounds, rejects outside", () => {
    expect(
      createComplaintSchema.parse({ ...base, idempotencyKey: "abcd1234" })
        .idempotencyKey
    ).toBe("abcd1234");
    expect(() =>
      createComplaintSchema.parse({ ...base, idempotencyKey: "short" })
    ).toThrow();
    expect(() =>
      createComplaintSchema.parse({ ...base, idempotencyKey: "x".repeat(200) })
    ).toThrow();
  });

  it("rejects attachment with invalid URL", () => {
    expect(() =>
      createComplaintSchema.parse({
        ...base,
        attachments: [
          {
            fileUrl: "not-a-url",
            fileName: "a.png",
            fileType: "image/png",
            fileSize: 100,
          },
        ],
      })
    ).toThrow();
  });

  it("rejects attachment over 10MB", () => {
    expect(() =>
      createComplaintSchema.parse({
        ...base,
        attachments: [
          {
            fileUrl: "https://x.test/a.png",
            fileName: "a.png",
            fileType: "image/png",
            fileSize: 10 * 1024 * 1024 + 1,
          },
        ],
      })
    ).toThrow();
  });

  it("accepts isAnonymous, sectorId, priority overrides", () => {
    const parsed = createComplaintSchema.parse({
      ...base,
      priority: "HIGH",
      isAnonymous: true,
      sectorId: "sec-1",
    });
    expect(parsed.priority).toBe("HIGH");
    expect(parsed.isAnonymous).toBe(true);
    expect(parsed.sectorId).toBe("sec-1");
  });
});

describe("updateStatusSchema", () => {
  it("accepts valid status", () => {
    expect(updateStatusSchema.parse({ status: "RESOLVED" })).toEqual({
      status: "RESOLVED",
    });
  });

  it("accepts notes when not empty", () => {
    expect(
      updateStatusSchema.parse({ status: "RESOLVED", notes: "ok" }).notes
    ).toBe("ok");
  });

  it("rejects empty notes", () => {
    expect(() => updateStatusSchema.parse({ status: "RESOLVED", notes: "" })).toThrow();
  });

  it("rejects invalid status", () => {
    expect(() => updateStatusSchema.parse({ status: "FOO" })).toThrow();
  });
});

describe("updatePrioritySchema", () => {
  it("accepts valid priority", () => {
    expect(updatePrioritySchema.parse({ priority: "LOW" }).priority).toBe("LOW");
  });
  it("rejects invalid", () => {
    expect(() => updatePrioritySchema.parse({ priority: "URGENT" })).toThrow();
  });
});

describe("addCommentSchema", () => {
  it("defaults notifyWhatsapp to true", () => {
    const parsed = addCommentSchema.parse({ notes: "ola" });
    expect(parsed.notifyWhatsapp).toBe(true);
  });
  it("accepts explicit false", () => {
    expect(addCommentSchema.parse({ notes: "ola", notifyWhatsapp: false }).notifyWhatsapp).toBe(false);
  });
  it("rejects empty notes", () => {
    expect(() => addCommentSchema.parse({ notes: "" })).toThrow();
  });
});

describe("assignComplaintSchema", () => {
  it("requires sectorId", () => {
    expect(() => assignComplaintSchema.parse({})).toThrow();
  });
  it("accepts optional assigneeId + reason", () => {
    const parsed = assignComplaintSchema.parse({
      sectorId: "s1",
      assigneeId: "u1",
      reason: "manual",
    });
    expect(parsed).toMatchObject({
      sectorId: "s1",
      assigneeId: "u1",
      reason: "manual",
    });
  });
  it("rejects empty sectorId", () => {
    expect(() => assignComplaintSchema.parse({ sectorId: "" })).toThrow();
  });
});

describe("pauseSlaSchema", () => {
  it("accepts WAITING_USER with reason", () => {
    expect(
      pauseSlaSchema.parse({ status: "WAITING_USER", reason: "aguardando" })
    ).toMatchObject({ status: "WAITING_USER", reason: "aguardando" });
  });
  it("rejects non-waiting status", () => {
    expect(() => pauseSlaSchema.parse({ status: "IN_PROGRESS", reason: "x" })).toThrow();
  });
  it("rejects empty reason", () => {
    expect(() => pauseSlaSchema.parse({ status: "WAITING_USER", reason: "" })).toThrow();
  });
  it("coerces pausedUntil to Date", () => {
    const parsed = pauseSlaSchema.parse({
      status: "WAITING_USER",
      reason: "x",
      pausedUntil: "2030-01-01T00:00:00Z",
    });
    expect(parsed.pausedUntil).toBeInstanceOf(Date);
  });
});

describe("resumeSlaSchema", () => {
  it("accepts empty object", () => {
    expect(resumeSlaSchema.parse({})).toEqual({});
  });
  it("accepts notes", () => {
    expect(resumeSlaSchema.parse({ notes: "ok" }).notes).toBe("ok");
  });
  it("rejects empty notes", () => {
    expect(() => resumeSlaSchema.parse({ notes: "" })).toThrow();
  });
});

describe("addAttachmentSchema", () => {
  it("accepts image/png", () => {
    expect(
      addAttachmentSchema.parse({
        fileUrl: "https://x.test/a.png",
        fileName: "a.png",
        fileType: "image/png",
        fileSize: 1000,
      })
    ).toBeTruthy();
  });
  it("accepts audio/mpeg", () => {
    expect(
      addAttachmentSchema.parse({
        fileUrl: "https://x.test/a.mp3",
        fileName: "a.mp3",
        fileType: "audio/mpeg",
        fileSize: 1000,
      })
    ).toBeTruthy();
  });
  it("accepts audio/* via regex", () => {
    expect(
      addAttachmentSchema.parse({
        fileUrl: "https://x.test/a.ogg",
        fileName: "a.ogg",
        fileType: "audio/ogg",
        fileSize: 1000,
      })
    ).toBeTruthy();
  });
  it("rejects non-image/non-audio mime", () => {
    expect(() =>
      addAttachmentSchema.parse({
        fileUrl: "https://x.test/a.pdf",
        fileName: "a.pdf",
        fileType: "application/pdf",
        fileSize: 1000,
      })
    ).toThrow();
  });
  it("rejects invalid URL", () => {
    expect(() =>
      addAttachmentSchema.parse({
        fileUrl: "nope",
        fileName: "a.png",
        fileType: "image/png",
        fileSize: 100,
      })
    ).toThrow();
  });
  it("rejects oversize file", () => {
    expect(() =>
      addAttachmentSchema.parse({
        fileUrl: "https://x.test/a.png",
        fileName: "a.png",
        fileType: "image/png",
        fileSize: 10 * 1024 * 1024 + 1,
      })
    ).toThrow();
  });
});

describe("updateComplaintSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(updateComplaintSchema.parse({})).toEqual({});
  });
  it("accepts partial fields", () => {
    expect(
      updateComplaintSchema.parse({ status: "RESOLVED", category: "outro" })
    ).toMatchObject({ status: "RESOLVED", category: "outro" });
  });
  it("rejects bad status", () => {
    expect(() => updateComplaintSchema.parse({ status: "FOO" })).toThrow();
  });
});

describe("complaintStatsQuerySchema", () => {
  it("optional condominiumId", () => {
    expect(complaintStatsQuerySchema.parse({})).toEqual({});
    expect(complaintStatsQuerySchema.parse({ condominiumId: "c1" }).condominiumId).toBe("c1");
  });
});

describe("complaintFiltersSchema", () => {
  it("applies defaults", () => {
    const parsed = complaintFiltersSchema.parse({});
    expect(parsed.pageSize).toBe(20);
    expect(parsed.page).toBeUndefined();
  });
  it("coerces numeric page/pageSize from strings", () => {
    const parsed = complaintFiltersSchema.parse({ page: "2", pageSize: "50" });
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(50);
  });
  it("rejects pageSize > 200", () => {
    expect(() => complaintFiltersSchema.parse({ pageSize: 500 })).toThrow();
  });
  it("rejects non-positive page", () => {
    expect(() => complaintFiltersSchema.parse({ page: 0 })).toThrow();
    expect(() => complaintFiltersSchema.parse({ page: -1 })).toThrow();
  });
});

describe("complaintIdParamSchema", () => {
  it("coerces numeric string", () => {
    expect(complaintIdParamSchema.parse({ id: "42" }).id).toBe(42);
  });
  it("rejects non-numeric", () => {
    expect(() => complaintIdParamSchema.parse({ id: "abc" })).toThrow();
  });
});

describe("condominiumIdParamSchema", () => {
  it("accepts non-empty string", () => {
    expect(condominiumIdParamSchema.parse({ condominiumId: "c1" }).condominiumId).toBe("c1");
  });
  it("rejects empty string", () => {
    expect(() => condominiumIdParamSchema.parse({ condominiumId: "" })).toThrow();
  });
});
