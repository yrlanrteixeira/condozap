export type SubscriptionPhase =
  | "trial"
  | "active"
  | "grace"
  | "soft_locked"
  | "hard_locked"
  | "expired"
  | "cancelled";

export interface PlanDto {
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

export interface SubscriptionDto {
  id: string;
  status: string;
  phase: SubscriptionPhase;
  canRead: boolean;
  canWrite: boolean;
  daysUntilPhaseChange: number | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  phaseEndsAt: string | null;
  setupPaid: boolean;
  currentPlan: PlanDto | null;
}

export interface BillBreakdown {
  activeCondos?: number;
  pricePerCondoCents?: number;
  cycleAmountCents?: number;
  setupAmountCents?: number;
  manual?: boolean;
  description?: string;
}

export interface BillDto {
  id: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "FAILED";
  type: "FIRST_CYCLE" | "SUBSCRIPTION_CYCLE" | "MANUAL";
  method: "PIX" | "CARD" | null;
  amountCents: number;
  breakdown: BillBreakdown;
  periodStart: string | null;
  periodEnd: string | null;
  pixBrCode: string | null;
  pixBrCodeBase64: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface PlatformMetricsDto {
  mrrCents: number;
  counts: {
    trial: number;
    active: number;
    cancelled: number;
    expired: number;
  };
  trialsExpiring: Array<SubscriptionDto & { syndic: { id: string; name: string; email: string } }>;
  overdue: Array<SubscriptionDto & { syndic: { id: string; name: string; email: string }; plan: PlanDto | null }>;
}
