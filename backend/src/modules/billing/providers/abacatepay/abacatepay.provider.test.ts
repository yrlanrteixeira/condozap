import { describe, expect, it, vi } from "vitest";
import { AbacatePayProvider } from "./abacatepay.provider";
import type { AbacatePayClient } from "./abacatepay.client";

/**
 * Provider unit tests exercise the request shape AbacatePayProvider sends
 * to the low-level client. We pass a fake client with a spy `request`.
 */

function fakeClient(impl: (path: string, init: RequestInit) => unknown): AbacatePayClient {
  return {
    request: vi.fn(async (path: string, init: RequestInit = {}) => impl(path, init)),
  } as unknown as AbacatePayClient;
}

describe("AbacatePayProvider", () => {
  it("has stable provider id", () => {
    expect(new AbacatePayProvider(fakeClient(() => ({}))).id).toBe("abacatepay");
  });

  it("createCustomer posts to /v1/customer/create and maps response", async () => {
    const client = fakeClient((path, init) => {
      expect(path).toBe("/v1/customer/create");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        name: "A",
        email: "a@x.com",
        cellphone: "+5511",
        taxId: "1",
      });
      return {
        id: "cust_1",
        metadata: { name: "A", email: "a@x.com", cellphone: "+5511", taxId: "1" },
      };
    });
    const provider = new AbacatePayProvider(client);
    const out = await provider.createCustomer({
      name: "A",
      email: "a@x.com",
      cellphone: "+5511",
      taxId: "1",
    });
    expect(out).toEqual({ externalId: "cust_1", name: "A", email: "a@x.com" });
  });

  it("createPixBill omits customerId when not provided", async () => {
    const client = fakeClient((path, init) => {
      expect(path).toBe("/v1/pixQrCode/create");
      const body = JSON.parse(init.body as string);
      expect(body).toEqual({
        amount: 1000,
        expiresIn: 300,
        description: "hi",
        metadata: { billId: "b", subscriptionId: "s" },
      });
      expect(body.customerId).toBeUndefined();
      return {
        id: "pix",
        brCode: "BR",
        brCodeBase64: "B64",
        expiresAt: "2026-04-22T00:00:00Z",
        amount: 1000,
        status: "PENDING",
        devMode: true,
        platformFee: 0,
        createdAt: "",
        updatedAt: "",
      };
    });
    const provider = new AbacatePayProvider(client);
    const out = await provider.createPixBill({
      amountCents: 1000,
      expiresInSeconds: 300,
      description: "hi",
      metadata: { billId: "b", subscriptionId: "s" },
    });
    expect(out.externalId).toBe("pix");
    expect(out.brCode).toBe("BR");
  });

  it("createPixBill includes customerId when provided", async () => {
    const client = fakeClient((_path, init) => {
      const body = JSON.parse(init.body as string);
      expect(body.customerId).toBe("cust_1");
      return {
        id: "pix",
        brCode: "",
        brCodeBase64: "",
        expiresAt: "2026-04-22T00:00:00Z",
      };
    });
    await new AbacatePayProvider(client).createPixBill({
      amountCents: 1,
      expiresInSeconds: 1,
      description: "",
      customerExternalId: "cust_1",
      metadata: { billId: "b", subscriptionId: "s" },
    });
  });

  it("createCardBill posts product + urls and returns mapped result", async () => {
    const client = fakeClient((path, init) => {
      expect(path).toBe("/v1/billing/create");
      const body = JSON.parse(init.body as string);
      expect(body.methods).toEqual(["CARD"]);
      expect(body.frequency).toBe("ONE_TIME");
      expect(body.products).toHaveLength(1);
      expect(body.products[0]).toMatchObject({
        name: "Prod",
        quantity: 1,
        price: 4990,
        externalId: "bill_1",
      });
      expect(body.returnUrl).toBe("https://r");
      expect(body.completionUrl).toBe("https://c");
      return {
        id: "bill_ext",
        url: "https://checkout",
        amount: 4990,
        status: "PENDING",
        devMode: false,
        methods: ["CARD"],
        products: [],
        frequency: "ONE_TIME",
        nextBilling: null,
        customer: null,
        createdAt: "",
        updatedAt: "",
      };
    });
    const out = await new AbacatePayProvider(client).createCardBill({
      amountCents: 4990,
      description: "d",
      productName: "Prod",
      returnUrl: "https://r",
      completionUrl: "https://c",
      metadata: { billId: "bill_1", subscriptionId: "sub_1" },
    });
    expect(out.checkoutUrl).toBe("https://checkout");
    expect(out.externalId).toBe("bill_ext");
  });

  it("createCardBill adds customerId when given", async () => {
    const client = fakeClient((_p, init) => {
      const body = JSON.parse(init.body as string);
      expect(body.customerId).toBe("cust_z");
      return {
        id: "b",
        url: "u",
        amount: 0,
        status: "",
        devMode: false,
        methods: [],
        products: [],
        frequency: "ONE_TIME",
        nextBilling: null,
        customer: null,
        createdAt: "",
        updatedAt: "",
      };
    });
    await new AbacatePayProvider(client).createCardBill({
      amountCents: 1,
      description: "",
      productName: "",
      customerExternalId: "cust_z",
      returnUrl: "",
      completionUrl: "",
      metadata: { billId: "b", subscriptionId: "s" },
    });
  });

  it("parseWebhook delegates to mapper", () => {
    const provider = new AbacatePayProvider(fakeClient(() => ({})));
    expect(
      provider.parseWebhook({ event: "billing.paid", data: { id: "b_1" } })?.eventType,
    ).toBe("bill.paid");
    expect(provider.parseWebhook(null)).toBeNull();
  });
});
