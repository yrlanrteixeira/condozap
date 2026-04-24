import { describe, expect, it } from "vitest";
import {
  messagesParamsSchema,
  messagesQuerySchema,
  sendMessageSchema,
  messageIdParamSchema,
  messageStatsQuerySchema,
} from "./messages.schema";

describe("messages.schema — params", () => {
  it("messagesParamsSchema requires condominiumId", () => {
    expect(messagesParamsSchema.parse({ condominiumId: "c1" }).condominiumId).toBe(
      "c1"
    );
    expect(messagesParamsSchema.safeParse({}).success).toBe(false);
  });

  it("messageIdParamSchema requires id", () => {
    expect(messageIdParamSchema.parse({ id: "m1" }).id).toBe("m1");
    expect(messageIdParamSchema.safeParse({ id: "" }).success).toBe(false);
  });
});

describe("messages.schema — messagesQuerySchema", () => {
  it("accepts empty query", () => {
    expect(messagesQuerySchema.parse({})).toEqual({});
  });
  it("coerces limit to number", () => {
    expect(messagesQuerySchema.parse({ limit: "25" }).limit).toBe(25);
  });
});

describe("messages.schema — messageStatsQuerySchema", () => {
  it("requires condominiumId", () => {
    expect(
      messageStatsQuerySchema.safeParse({ startDate: "2025-01-01" }).success
    ).toBe(false);
  });
  it("coerces startDate and endDate", () => {
    const parsed = messageStatsQuerySchema.parse({
      condominiumId: "c1",
      startDate: "2025-01-01",
      endDate: "2025-02-01",
    });
    expect(parsed.startDate).toBeInstanceOf(Date);
    expect(parsed.endDate).toBeInstanceOf(Date);
  });
});

describe("messages.schema — sendMessageSchema", () => {
  const base = {
    condominiumId: "c1",
    type: "TEXT" as const,
    content: { text: "hi" },
    target: { scope: "ALL" as const },
  };

  it("accepts minimal TEXT to ALL", () => {
    expect(sendMessageSchema.parse(base).type).toBe("TEXT");
  });

  it("accepts TOWER target with tower field", () => {
    const parsed = sendMessageSchema.parse({
      ...base,
      target: { scope: "TOWER", tower: "A" },
    });
    expect(parsed.target.tower).toBe("A");
  });

  it("rejects IMAGE without mediaUrl", () => {
    const r = sendMessageSchema.safeParse({
      ...base,
      type: "IMAGE",
      content: { text: "" },
    });
    expect(r.success).toBe(false);
  });

  it("accepts IMAGE with mediaUrl", () => {
    const parsed = sendMessageSchema.parse({
      ...base,
      type: "IMAGE",
      content: { text: "" },
      mediaUrl: "https://example.com/img.png",
    });
    expect(parsed.mediaUrl).toBe("https://example.com/img.png");
  });

  it("rejects TEXT with empty content.text", () => {
    const r = sendMessageSchema.safeParse({
      ...base,
      content: { text: "   " },
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid type enum", () => {
    expect(
      sendMessageSchema.safeParse({ ...base, type: "VIDEO" }).success
    ).toBe(false);
  });

  it("rejects invalid scope enum", () => {
    expect(
      sendMessageSchema.safeParse({ ...base, target: { scope: "BUILDING" } }).success
    ).toBe(false);
  });
});
