import { beforeEach, describe, expect, it } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import { getTestPrisma } from "../../../../test/helpers/db";
import { setupIntegrationSuite } from "../../../../test/helpers/build-test-app";
import { makeCondominium, makeUser } from "../../../../test/factories";
import { mockAbacatePayRequest } from "../../../../test/mocks/abacatepay-client";
import { _resetPaymentProviderCache } from "../providers/provider.factory";
import * as service from "./bills.service";

setupIntegrationSuite();

beforeEach(() => {
  mockAbacatePayRequest.mockReset();
  _resetPaymentProviderCache();
});

async function seedContext(opts: { condos?: number; setupPaid?: boolean } = {}) {
  const p = getTestPrisma();
  const plan = await p.plan.create({
    data: {
      slug: "basic",
      displayName: "Basic",
      minCondominiums: 1,
      maxCondominiums: 10,
      pricePerCondoCents: 4990,
      setupFeeCents: 200000,
      sortOrder: 1,
    },
  });
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  for (let i = 0; i < (opts.condos ?? 2); i++) {
    await makeCondominium({ primarySyndicId: syndic.id });
  }
  const sub = await p.subscription.create({
    data: {
      syndicId: syndic.id,
      status: SubscriptionStatus.TRIAL,
      setupPaid: opts.setupPaid ?? false,
    },
  });
  return { syndic, sub, plan };
}

describe("createPixBillForCurrentCycle", () => {
  it("throws NotFound when no subscription exists", async () => {
    const u = await makeUser({ role: UserRole.SYNDIC });
    await expect(
      service.createPixBillForCurrentCycle(getTestPrisma(), u.id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("creates a PIX bill and stores externalId + brCode (first cycle includes setup)", async () => {
    const { syndic } = await seedContext({ condos: 2, setupPaid: false });
    mockAbacatePayRequest.mockResolvedValueOnce({
      id: "ext_pix_1",
      brCode: "BR",
      brCodeBase64: "B64",
      expiresAt: "2026-05-01T00:00:00Z",
      amount: 0,
      status: "PENDING",
      devMode: true,
      platformFee: 0,
      createdAt: "",
      updatedAt: "",
    });

    const bill = await service.createPixBillForCurrentCycle(getTestPrisma(), syndic.id);
    expect(bill.type).toBe("FIRST_CYCLE");
    expect(bill.externalId).toBe("ext_pix_1");
    expect(bill.pixBrCode).toBe("BR");
    expect(bill.amountCents).toBe(2 * 4990 + 200000);
  });

  it("reuses an existing fully-formed pending bill (click-spam idempotency)", async () => {
    const { syndic } = await seedContext({ condos: 1 });
    mockAbacatePayRequest.mockResolvedValue({
      id: "ext_reuse",
      brCode: "BR",
      brCodeBase64: "B64",
      expiresAt: "2026-05-01T00:00:00Z",
    });

    const first = await service.createPixBillForCurrentCycle(getTestPrisma(), syndic.id);
    const second = await service.createPixBillForCurrentCycle(getTestPrisma(), syndic.id);
    expect(second.id).toBe(first.id);
    // second call should not trigger another AbacatePay request
    expect(mockAbacatePayRequest).toHaveBeenCalledTimes(1);
  });

  it("rolls back the bill row when the provider call fails", async () => {
    const { syndic } = await seedContext({ condos: 1 });
    mockAbacatePayRequest.mockRejectedValueOnce(new Error("provider down"));
    await expect(
      service.createPixBillForCurrentCycle(getTestPrisma(), syndic.id),
    ).rejects.toThrow(/provider down/);

    const bills = await getTestPrisma().paymentBill.findMany();
    expect(bills).toHaveLength(0);
  });

  it("uses SUBSCRIPTION_CYCLE (no setup fee) when setupPaid=true", async () => {
    const { syndic } = await seedContext({ condos: 1, setupPaid: true });
    mockAbacatePayRequest.mockResolvedValueOnce({
      id: "ext_cycle",
      brCode: "BR",
      brCodeBase64: "B64",
      expiresAt: "2026-05-01T00:00:00Z",
    });
    const bill = await service.createPixBillForCurrentCycle(getTestPrisma(), syndic.id);
    expect(bill.type).toBe("SUBSCRIPTION_CYCLE");
    expect(bill.amountCents).toBe(4990);
  });
});

describe("createCardBillForCurrentCycle", () => {
  it("creates a card bill and persists checkoutUrl", async () => {
    const { syndic } = await seedContext({ condos: 1 });
    mockAbacatePayRequest.mockResolvedValueOnce({
      id: "ext_card",
      url: "https://checkout",
      amount: 0,
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
    const bill = await service.createCardBillForCurrentCycle(getTestPrisma(), syndic.id);
    expect(bill.externalId).toBe("ext_card");
    expect(bill.checkoutUrl).toBe("https://checkout");
  });

  it("rolls back the bill row when the provider fails", async () => {
    const { syndic } = await seedContext({ condos: 1 });
    mockAbacatePayRequest.mockRejectedValueOnce(new Error("card down"));
    await expect(
      service.createCardBillForCurrentCycle(getTestPrisma(), syndic.id),
    ).rejects.toThrow(/card down/);
    const rows = await getTestPrisma().paymentBill.findMany();
    expect(rows).toHaveLength(0);
  });

  it("throws NotFound when subscription missing", async () => {
    const u = await makeUser({ role: UserRole.SYNDIC });
    await expect(
      service.createCardBillForCurrentCycle(getTestPrisma(), u.id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("listMyBills", () => {
  it("returns [] when no subscription", async () => {
    const u = await makeUser({ role: UserRole.SYNDIC });
    const res = await service.listMyBills(getTestPrisma(), u.id);
    expect(res).toEqual([]);
  });

  it("returns bills sorted desc without providerPayload leaking", async () => {
    const { syndic, sub } = await seedContext({ condos: 1 });
    const p = getTestPrisma();
    await p.paymentBill.create({
      data: {
        subscriptionId: sub.id,
        type: "SUBSCRIPTION_CYCLE",
        status: "PENDING",
        amountCents: 1000,
        breakdown: {},
        providerPayload: { secret: "DO_NOT_LEAK" },
      },
    });
    const bills = await service.listMyBills(p, syndic.id);
    expect(bills).toHaveLength(1);
    expect((bills[0] as Record<string, unknown>).providerPayload).toBeUndefined();
  });
});

describe("listBillsForSyndic", () => {
  it("throws NotFound for unknown syndic", async () => {
    await expect(
      service.listBillsForSyndic(getTestPrisma(), "ghost"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns up to 50 bills for the syndic", async () => {
    const { syndic, sub } = await seedContext();
    await getTestPrisma().paymentBill.create({
      data: {
        subscriptionId: sub.id,
        type: "MANUAL",
        status: "PENDING",
        amountCents: 100,
        breakdown: {},
      },
    });
    const bills = await service.listBillsForSyndic(getTestPrisma(), syndic.id);
    expect(bills).toHaveLength(1);
  });
});

describe("createManualBill", () => {
  it("creates a manual PIX bill via provider", async () => {
    const { syndic } = await seedContext({ condos: 1 });
    mockAbacatePayRequest.mockResolvedValueOnce({
      id: "ext_manual",
      brCode: "BR",
      brCodeBase64: "B64",
      expiresAt: "2026-05-01T00:00:00Z",
    });
    const bill = await service.createManualBill(getTestPrisma(), syndic.id, 1500, "Taxa extra");
    expect(bill.type).toBe("MANUAL");
    expect(bill.externalId).toBe("ext_manual");
    expect(bill.amountCents).toBe(1500);
  });

  it("rolls back when provider fails", async () => {
    const { syndic } = await seedContext({ condos: 1 });
    mockAbacatePayRequest.mockRejectedValueOnce(new Error("nope"));
    await expect(
      service.createManualBill(getTestPrisma(), syndic.id, 500, "boom"),
    ).rejects.toThrow(/nope/);
    expect(await getTestPrisma().paymentBill.count()).toBe(0);
  });

  it("throws NotFound when subscription missing", async () => {
    const u = await makeUser({ role: UserRole.SYNDIC });
    await expect(
      service.createManualBill(getTestPrisma(), u.id, 1000, "x"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
