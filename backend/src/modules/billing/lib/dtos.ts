import type { PaymentBill, Plan, Subscription } from "@prisma/client";
import type { SubscriptionState } from "./subscription-state";

/**
 * Public-safe DTOs. These are the ONLY billing shapes the frontend sees.
 * No externalId, providerId, or providerPayload may be included in any
 * of these return types.
 */

export interface PublicPlanDto {
  id: string;
  slug: string;
  displayName: string;
  minCondominiums: number;
  maxCondominiums: number;
  pricePerCondoCents: number;
  setupFeeCents: number;
  isActive: boolean;
  sortOrder: number;
}

export interface PublicSubscriptionDto {
  id: string;
  status: string;
  phase: SubscriptionState["phase"];
  canRead: boolean;
  canWrite: boolean;
  daysUntilPhaseChange: number | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  phaseEndsAt: string | null;
  setupPaid: boolean;
  currentPlan: PublicPlanDto | null;
}

export interface PublicBillDto {
  id: string;
  status: string;
  type: string;
  method: string | null;
  amountCents: number;
  breakdown: unknown;
  periodStart: string | null;
  periodEnd: string | null;
  pixBrCode: string | null;
  pixBrCodeBase64: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export function toPublicPlanDto(plan: Plan): PublicPlanDto {
  return {
    id: plan.id,
    slug: plan.slug,
    displayName: plan.displayName,
    minCondominiums: plan.minCondominiums,
    maxCondominiums: plan.maxCondominiums,
    pricePerCondoCents: plan.pricePerCondoCents,
    setupFeeCents: plan.setupFeeCents,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  };
}

export function toPublicSubscriptionDto(
  sub: Subscription & { currentPlan?: Plan | null },
  state: SubscriptionState,
): PublicSubscriptionDto {
  return {
    id: sub.id,
    status: sub.status,
    phase: state.phase,
    canRead: state.canRead,
    canWrite: state.canWrite,
    daysUntilPhaseChange: state.daysUntilPhaseChange,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    phaseEndsAt: state.phaseEndsAt?.toISOString() ?? null,
    setupPaid: sub.setupPaid,
    currentPlan: sub.currentPlan ? toPublicPlanDto(sub.currentPlan) : null,
  };
}

export function toPublicBillDto(bill: PaymentBill): PublicBillDto {
  return {
    id: bill.id,
    status: bill.status,
    type: bill.type,
    method: bill.method,
    amountCents: bill.amountCents,
    breakdown: bill.breakdown,
    periodStart: bill.periodStart?.toISOString() ?? null,
    periodEnd: bill.periodEnd?.toISOString() ?? null,
    pixBrCode: bill.pixBrCode,
    pixBrCodeBase64: bill.pixBrCodeBase64,
    checkoutUrl: bill.checkoutUrl,
    expiresAt: bill.expiresAt?.toISOString() ?? null,
    paidAt: bill.paidAt?.toISOString() ?? null,
    createdAt: bill.createdAt.toISOString(),
    // Intentionally omitted: externalId, providerId, providerPayload
  };
}
