import type { Subscription } from "@prisma/client";
import { SubscriptionStatus } from "@prisma/client";

/**
 * Derived subscription phase — computed from persisted fields and the current
 * time. We deliberately do NOT persist these transitional states (GRACE,
 * SOFT_LOCKED, HARD_LOCKED) because deriving them eliminates the risk of
 * drift when a cron job fails to run.
 */
export type SubscriptionPhase =
  | "trial"
  | "active"
  | "grace"
  | "soft_locked"
  | "hard_locked"
  | "expired"
  | "cancelled";

export interface SubscriptionState {
  phase: SubscriptionPhase;
  canRead: boolean;
  canWrite: boolean;
  /**
   * Days until the next phase transition. Negative when already past.
   * Null when the current phase is terminal (cancelled / hard_locked).
   */
  daysUntilPhaseChange: number | null;
  /** When the current phase ends (trial end, cycle end, etc). Null if terminal. */
  phaseEndsAt: Date | null;
}

/**
 * Number of full days of grace AFTER expiration during which writes are
 * still allowed. With GRACE_DAYS = 3, grace covers `daysSince in [0, 1, 2]`
 * and flips to soft-locked at `daysSince = 3`.
 */
export const GRACE_DAYS = 3;

/**
 * `daysSince` at which hard lock begins. Soft-locked is the half-open
 * interval `[GRACE_DAYS, HARD_LOCK_START_DAYS)`. With the default values,
 * soft-locked spans `daysSince in [3..14]` (12 full days) and hard-locked
 * applies from `daysSince >= 15`, matching the spec:
 *   grace 3 days → soft lock 12 days → hard lock on day 15.
 */
export const HARD_LOCK_START_DAYS = 15;

/**
 * @deprecated Use HARD_LOCK_START_DAYS. Kept for backwards compatibility.
 */
export const SOFT_LOCK_END_DAYS = HARD_LOCK_START_DAYS;

function diffInDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function resolvePostExpiryPhase(expiredAt: Date, now: Date): SubscriptionState {
  const daysSince = diffInDays(expiredAt, now);

  // Grace: strictly less than GRACE_DAYS (3) full days since expiry.
  // Per spec §4.7: expiry D+44, soft_locked starts D+47 → 3 full days of grace
  // (daysSince = 0, 1, 2). At daysSince = 3 we transition to soft_locked.
  if (daysSince < GRACE_DAYS) {
    const phaseEndsAt = new Date(expiredAt);
    phaseEndsAt.setDate(phaseEndsAt.getDate() + GRACE_DAYS);
    return {
      phase: "grace",
      canRead: true,
      canWrite: true,
      daysUntilPhaseChange: GRACE_DAYS - daysSince,
      phaseEndsAt,
    };
  }

  // Soft-locked: GRACE_DAYS ≤ daysSince < HARD_LOCK_START_DAYS (15).
  // That gives 12 full days of soft lock (daysSince 3..14 inclusive).
  if (daysSince < HARD_LOCK_START_DAYS) {
    const phaseEndsAt = new Date(expiredAt);
    phaseEndsAt.setDate(phaseEndsAt.getDate() + HARD_LOCK_START_DAYS);
    return {
      phase: "soft_locked",
      canRead: true,
      canWrite: false,
      daysUntilPhaseChange: HARD_LOCK_START_DAYS - daysSince,
      phaseEndsAt,
    };
  }

  return {
    phase: "hard_locked",
    canRead: false,
    canWrite: false,
    daysUntilPhaseChange: null,
    phaseEndsAt: null,
  };
}

/**
 * Pure function: computes the current state of a subscription.
 * Single source of truth for "can this syndic write right now?".
 */
export function resolveSubscriptionState(
  sub: Pick<
    Subscription,
    "status" | "trialEndsAt" | "currentPeriodEnd"
  >,
  now: Date = new Date(),
): SubscriptionState {
  if (sub.status === SubscriptionStatus.CANCELLED) {
    return {
      phase: "cancelled",
      canRead: true,
      canWrite: false,
      daysUntilPhaseChange: null,
      phaseEndsAt: null,
    };
  }

  if (sub.status === SubscriptionStatus.EXPIRED) {
    return {
      phase: "expired",
      canRead: true,
      canWrite: false,
      daysUntilPhaseChange: null,
      phaseEndsAt: null,
    };
  }

  if (sub.status === SubscriptionStatus.TRIAL) {
    if (!sub.trialEndsAt) {
      // Shouldn't happen, but treat as expired trial
      return {
        phase: "expired",
        canRead: true,
        canWrite: false,
        daysUntilPhaseChange: null,
        phaseEndsAt: null,
      };
    }
    if (sub.trialEndsAt > now) {
      return {
        phase: "trial",
        canRead: true,
        canWrite: true,
        daysUntilPhaseChange: diffInDays(now, sub.trialEndsAt),
        phaseEndsAt: sub.trialEndsAt,
      };
    }
    return resolvePostExpiryPhase(sub.trialEndsAt, now);
  }

  // ACTIVE
  if (!sub.currentPeriodEnd) {
    return {
      phase: "expired",
      canRead: true,
      canWrite: false,
      daysUntilPhaseChange: null,
      phaseEndsAt: null,
    };
  }
  if (sub.currentPeriodEnd > now) {
    return {
      phase: "active",
      canRead: true,
      canWrite: true,
      daysUntilPhaseChange: diffInDays(now, sub.currentPeriodEnd),
      phaseEndsAt: sub.currentPeriodEnd,
    };
  }
  return resolvePostExpiryPhase(sub.currentPeriodEnd, now);
}
