import { describe, expect, it } from "vitest";
import type { PaymentBill, Plan, Subscription } from "@prisma/client";
import { toPublicBillDto, toPublicPlanDto, toPublicSubscriptionDto } from "./dtos";
import type { SubscriptionState } from "./subscription-state";

const plan: Plan = {
  id: "plan_1",
  slug: "basic",
  displayName: "Basic",
  minCondominiums: 1,
  maxCondominiums: 5,
  pricePerCondoCents: 4990,
  setupFeeCents: 200000,
  isActive: true,
  sortOrder: 1,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("toPublicPlanDto", () => {
  it("projects only the safe fields", () => {
    expect(toPublicPlanDto(plan)).toEqual({
      id: "plan_1",
      slug: "basic",
      displayName: "Basic",
      minCondominiums: 1,
      maxCondominiums: 5,
      pricePerCondoCents: 4990,
      setupFeeCents: 200000,
      isActive: true,
      sortOrder: 1,
    });
  });

  it("never leaks createdAt/updatedAt", () => {
    const dto = toPublicPlanDto(plan) as Record<string, unknown>;
    expect(dto.createdAt).toBeUndefined();
    expect(dto.updatedAt).toBeUndefined();
  });
});

describe("toPublicSubscriptionDto", () => {
  const state: SubscriptionState = {
    phase: "active",
    canRead: true,
    canWrite: true,
    daysUntilPhaseChange: 10,
    phaseEndsAt: new Date("2026-05-01T00:00:00Z"),
  };

  const baseSub: Subscription = {
    id: "sub_1",
    syndicId: "syndic_1",
    currentPlanId: "plan_1",
    status: "ACTIVE",
    trialEndsAt: null,
    currentPeriodStart: new Date("2026-04-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-05-01T00:00:00Z"),
    cancelledAt: null,
    setupPaid: true,
    providerId: "abacatepay",
    externalCustomerId: null,
    metadata: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-04-01T00:00:00Z"),
  };

  it("includes derived phase/capabilities and serializes dates as ISO", () => {
    const dto = toPublicSubscriptionDto({ ...baseSub, currentPlan: plan }, state);
    expect(dto.id).toBe("sub_1");
    expect(dto.phase).toBe("active");
    expect(dto.canRead).toBe(true);
    expect(dto.canWrite).toBe(true);
    expect(dto.daysUntilPhaseChange).toBe(10);
    expect(dto.currentPeriodEnd).toBe("2026-05-01T00:00:00.000Z");
    expect(dto.phaseEndsAt).toBe("2026-05-01T00:00:00.000Z");
    expect(dto.currentPlan?.id).toBe("plan_1");
  });

  it("returns null plan & null dates when unset", () => {
    const dto = toPublicSubscriptionDto(
      { ...baseSub, currentPlanId: null, currentPeriodEnd: null, currentPeriodStart: null, trialEndsAt: null, currentPlan: null },
      { ...state, phaseEndsAt: null },
    );
    expect(dto.currentPlan).toBeNull();
    expect(dto.currentPeriodEnd).toBeNull();
    expect(dto.currentPeriodStart).toBeNull();
    expect(dto.trialEndsAt).toBeNull();
    expect(dto.phaseEndsAt).toBeNull();
  });
});

describe("toPublicBillDto", () => {
  const now = new Date("2026-04-21T00:00:00Z");
  const bill: Omit<PaymentBill, "providerPayload"> = {
    id: "bill_1",
    subscriptionId: "sub_1",
    planId: "plan_1",
    type: "SUBSCRIPTION_CYCLE",
    method: "PIX",
    status: "PENDING",
    amountCents: 4990,
    breakdown: { base: 4990 },
    periodStart: now,
    periodEnd: now,
    providerId: "abacatepay",
    externalId: "ext_secret_123",
    checkoutUrl: null,
    pixBrCode: "PIX_CODE",
    pixBrCodeBase64: "QkFTRTY0",
    expiresAt: now,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  } as Omit<PaymentBill, "providerPayload">;

  it("exposes safe fields and serializes dates to ISO", () => {
    const dto = toPublicBillDto(bill);
    expect(dto.id).toBe("bill_1");
    expect(dto.amountCents).toBe(4990);
    expect(dto.pixBrCode).toBe("PIX_CODE");
    expect(dto.createdAt).toBe("2026-04-21T00:00:00.000Z");
    expect(dto.periodEnd).toBe("2026-04-21T00:00:00.000Z");
    expect(dto.expiresAt).toBe("2026-04-21T00:00:00.000Z");
  });

  it("NEVER exposes externalId, providerId, or providerPayload", () => {
    const dto = toPublicBillDto(bill) as Record<string, unknown>;
    expect(dto.externalId).toBeUndefined();
    expect(dto.providerId).toBeUndefined();
    expect(dto.providerPayload).toBeUndefined();
    expect(JSON.stringify(dto)).not.toContain("ext_secret_123");
  });

  it("handles null optional dates without throwing", () => {
    const dto = toPublicBillDto({
      ...bill,
      periodStart: null,
      periodEnd: null,
      expiresAt: null,
      paidAt: null,
    });
    expect(dto.periodStart).toBeNull();
    expect(dto.periodEnd).toBeNull();
    expect(dto.expiresAt).toBeNull();
    expect(dto.paidAt).toBeNull();
  });

  it("serializes paidAt when present", () => {
    const dto = toPublicBillDto({ ...bill, paidAt: now, status: "PAID" });
    expect(dto.paidAt).toBe("2026-04-21T00:00:00.000Z");
    expect(dto.status).toBe("PAID");
  });
});
