import { describe, expect, it } from "vitest";
import {
  mapCardBill,
  mapCustomer,
  mapPixBill,
  mapWebhookEvent,
} from "./abacatepay.mappers";

describe("mapCustomer", () => {
  it("maps the AbacatePay customer shape to our internal CustomerResult", () => {
    const out = mapCustomer({
      id: "cust_1",
      metadata: {
        name: "Alice",
        email: "a@x.com",
        cellphone: "+5511999999999",
        taxId: "12345678900",
      },
    });
    expect(out).toEqual({ externalId: "cust_1", name: "Alice", email: "a@x.com" });
  });
});

describe("mapPixBill", () => {
  it("maps expiresAt string into a Date", () => {
    const out = mapPixBill({
      id: "pix_1",
      amount: 1000,
      status: "PENDING",
      devMode: true,
      brCode: "BRC",
      brCodeBase64: "B64",
      platformFee: 0,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      expiresAt: "2026-04-22T00:00:00Z",
    });
    expect(out.externalId).toBe("pix_1");
    expect(out.brCode).toBe("BRC");
    expect(out.brCodeBase64).toBe("B64");
    expect(out.expiresAt).toBeInstanceOf(Date);
    expect(out.expiresAt.toISOString()).toBe("2026-04-22T00:00:00.000Z");
  });
});

describe("mapCardBill", () => {
  it("maps id+url into externalId+checkoutUrl", () => {
    const out = mapCardBill({
      id: "bill_1",
      url: "https://checkout",
      amount: 1,
      status: "PENDING",
      devMode: false,
      methods: ["CARD"],
      products: [],
      frequency: "ONE_TIME",
      nextBilling: null,
      customer: null,
      createdAt: "",
      updatedAt: "",
    });
    expect(out).toEqual({ externalId: "bill_1", checkoutUrl: "https://checkout" });
  });
});

describe("mapWebhookEvent", () => {
  it.each([
    ["billing.paid", "bill.paid"],
    ["pix.paid", "bill.paid"],
  ])("normalizes %s -> %s", (event, expected) => {
    const out = mapWebhookEvent({ event, data: { id: "bill_X" } });
    expect(out?.eventType).toBe(expected);
    expect(out?.externalBillId).toBe("bill_X");
    expect(out?.paidAt).toBeInstanceOf(Date);
    expect(out?.rawEvent).toBe(event);
  });

  it.each([
    ["pix.expired", "bill.expired"],
    ["billing.expired", "bill.expired"],
  ])("normalizes %s -> %s", (event, expected) => {
    const out = mapWebhookEvent({ event, data: { id: "b1" } });
    expect(out?.eventType).toBe(expected);
    expect(out?.paidAt).toBeUndefined();
  });

  it.each([
    ["billing.failed", "bill.failed"],
    ["pix.failed", "bill.failed"],
  ])("normalizes %s -> %s", (event, expected) => {
    const out = mapWebhookEvent({ event, data: { id: "b1" } });
    expect(out?.eventType).toBe(expected);
  });

  it("returns null for unknown events", () => {
    expect(mapWebhookEvent({ event: "foo", data: { id: "b" } })).toBeNull();
  });

  it("returns null for non-object / malformed payloads", () => {
    expect(mapWebhookEvent(null)).toBeNull();
    expect(mapWebhookEvent("string")).toBeNull();
    expect(mapWebhookEvent({ event: "billing.paid" })).toBeNull(); // missing id
    expect(mapWebhookEvent({ data: { id: "b" } })).toBeNull(); // missing event
    expect(mapWebhookEvent({ event: 5, data: { id: "b" } })).toBeNull(); // wrong type
  });
});
