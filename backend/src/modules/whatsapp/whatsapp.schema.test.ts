import { describe, expect, it } from "vitest";
import {
  webhookVerifyQuerySchema,
  whatsappWebhookBodySchema,
  sendWhatsAppSchema,
  sendBulkWhatsAppSchema,
} from "./whatsapp.schema";

describe("whatsapp.schema — webhookVerifyQuerySchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(webhookVerifyQuerySchema.parse({})).toEqual({});
  });
  it("accepts subscribe flow fields", () => {
    const parsed = webhookVerifyQuerySchema.parse({
      "hub.mode": "subscribe",
      "hub.verify_token": "tok",
      "hub.challenge": "123",
    });
    expect(parsed["hub.challenge"]).toBe("123");
  });
});

describe("whatsapp.schema — whatsappWebhookBodySchema", () => {
  it("defaults entry to empty array", () => {
    expect(whatsappWebhookBodySchema.parse({}).entry).toEqual([]);
  });

  it("parses nested statuses", () => {
    const parsed = whatsappWebhookBodySchema.parse({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: "wamid.1", status: "delivered" }],
              },
            },
          ],
        },
      ],
    });
    expect(parsed.entry[0].changes[0].value.statuses?.[0].id).toBe("wamid.1");
  });
});

describe("whatsapp.schema — sendWhatsAppSchema", () => {
  it("accepts minimal payload with text default", () => {
    const parsed = sendWhatsAppSchema.parse({
      to: "5511987654321",
      message: "hi",
      condominiumId: "c1",
    });
    expect(parsed.type).toBe("text");
  });

  it("rejects empty message", () => {
    expect(
      sendWhatsAppSchema.safeParse({
        to: "x",
        message: "",
        condominiumId: "c",
      }).success
    ).toBe(false);
  });

  it("rejects unknown type", () => {
    expect(
      sendWhatsAppSchema.safeParse({
        to: "x",
        message: "m",
        condominiumId: "c",
        type: "video",
      }).success
    ).toBe(false);
  });
});

describe("whatsapp.schema — sendBulkWhatsAppSchema", () => {
  it("accepts minimal payload", () => {
    const parsed = sendBulkWhatsAppSchema.parse({
      condominiumId: "c1",
      recipients: [{ phone: "5511987654321" }],
      message: "hi",
    });
    expect(parsed.recipients).toHaveLength(1);
  });

  it("accepts empty recipients array (no min)", () => {
    expect(
      sendBulkWhatsAppSchema.safeParse({
        condominiumId: "c1",
        recipients: [],
        message: "hi",
      }).success
    ).toBe(true);
  });

  it("rejects empty message", () => {
    expect(
      sendBulkWhatsAppSchema.safeParse({
        condominiumId: "c1",
        recipients: [],
        message: "",
      }).success
    ).toBe(false);
  });
});
