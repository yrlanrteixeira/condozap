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
 * Grace period (writes still allowed) after expiration.
 */
export const GRACE_DAYS = 3;

/**
 * Total days after expiration at which soft lock ends and hard lock begins.
 * Soft lock runs from `GRACE_DAYS + 1` through `SOFT_LOCK_END_DAYS`.
 */
export const SOFT_LOCK_END_DAYS = 14;

function diffInDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function resolvePostExpiryPhase(expiredAt: Date, now: Date): SubscriptionState {
  const daysSince = diffInDays(expiredAt, now);

  if (daysSince <= GRACE_DAYS) {
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

  if (daysSince <= SOFT_LOCK_END_DAYS) {
    const phaseEndsAt = new Date(expiredAt);
    phaseEndsAt.setDate(phaseEndsAt.getDate() + SOFT_LOCK_END_DAYS);
    return {
      phase: "soft_locked",
      canRead: true,
      canWrite: false,
      daysUntilPhaseChange: SOFT_LOCK_END_DAYS - daysSince,
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
