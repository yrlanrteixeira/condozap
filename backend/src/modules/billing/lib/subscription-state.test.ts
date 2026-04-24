import { describe, expect, it } from "vitest";
import {
  GRACE_DAYS,
  HARD_LOCK_START_DAYS,
  SOFT_LOCK_END_DAYS,
  resolveSubscriptionState,
} from "./subscription-state";

/**
 * Pure unit tests for resolveSubscriptionState — the single source of truth
 * for "can this syndic write right now?".
 *
 * Each test exercises one branch of the phase-resolution tree and doubles as
 * executable documentation for the grace / soft-lock / hard-lock windows.
 */

const daysAgo = (d: number, base = new Date("2026-04-21T12:00:00Z")): Date =>
  new Date(base.getTime() - d * 24 * 3600 * 1000);
const daysFromNow = (d: number, base = new Date("2026-04-21T12:00:00Z")): Date =>
  new Date(base.getTime() + d * 24 * 3600 * 1000);
const NOW = new Date("2026-04-21T12:00:00Z");

describe("resolveSubscriptionState — constants", () => {
  it("exposes 3-day grace window", () => {
    expect(GRACE_DAYS).toBe(3);
  });
  it("exposes 15-day hard-lock start and legacy SOFT_LOCK_END_DAYS alias", () => {
    expect(HARD_LOCK_START_DAYS).toBe(15);
    expect(SOFT_LOCK_END_DAYS).toBe(HARD_LOCK_START_DAYS);
  });
});

describe("resolveSubscriptionState — terminal statuses", () => {
  it("returns cancelled (read-only) when status is CANCELLED", () => {
    const state = resolveSubscriptionState(
      { status: "CANCELLED", trialEndsAt: null, currentPeriodEnd: null },
      NOW,
    );
    expect(state).toEqual({
      phase: "cancelled",
      canRead: true,
      canWrite: false,
      daysUntilPhaseChange: null,
      phaseEndsAt: null,
    });
  });

  it("returns expired (read-only) when status is EXPIRED", () => {
    const state = resolveSubscriptionState(
      { status: "EXPIRED", trialEndsAt: null, currentPeriodEnd: null },
      NOW,
    );
    expect(state.phase).toBe("expired");
    expect(state.canWrite).toBe(false);
    expect(state.canRead).toBe(true);
  });
});

describe("resolveSubscriptionState — TRIAL flow", () => {
  it("treats TRIAL with no trialEndsAt as expired (defensive)", () => {
    const state = resolveSubscriptionState(
      { status: "TRIAL", trialEndsAt: null, currentPeriodEnd: null },
      NOW,
    );
    expect(state.phase).toBe("expired");
  });

  it("returns trial phase when trialEndsAt is in the future", () => {
    const state = resolveSubscriptionState(
      { status: "TRIAL", trialEndsAt: daysFromNow(5), currentPeriodEnd: null },
      NOW,
    );
    expect(state.phase).toBe("trial");
    expect(state.canWrite).toBe(true);
    expect(state.daysUntilPhaseChange).toBe(5);
    expect(state.phaseEndsAt).toEqual(daysFromNow(5));
  });

  it("after trial expiry with 0 days since — grace with 3 days remaining", () => {
    const state = resolveSubscriptionState(
      { status: "TRIAL", trialEndsAt: daysAgo(0), currentPeriodEnd: null },
      NOW,
    );
    expect(state.phase).toBe("grace");
    expect(state.canWrite).toBe(true);
    expect(state.daysUntilPhaseChange).toBe(3);
  });

  it("at 3 days since expiry — transitions to soft_locked", () => {
    const state = resolveSubscriptionState(
      { status: "TRIAL", trialEndsAt: daysAgo(3), currentPeriodEnd: null },
      NOW,
    );
    expect(state.phase).toBe("soft_locked");
    expect(state.canRead).toBe(true);
    expect(state.canWrite).toBe(false);
    expect(state.daysUntilPhaseChange).toBe(12);
  });

  it("at 14 days since expiry — still soft_locked (boundary)", () => {
    const state = resolveSubscriptionState(
      { status: "TRIAL", trialEndsAt: daysAgo(14), currentPeriodEnd: null },
      NOW,
    );
    expect(state.phase).toBe("soft_locked");
    expect(state.daysUntilPhaseChange).toBe(1);
  });

  it("at 15 days since expiry — hard_locked (terminal)", () => {
    const state = resolveSubscriptionState(
      { status: "TRIAL", trialEndsAt: daysAgo(15), currentPeriodEnd: null },
      NOW,
    );
    expect(state.phase).toBe("hard_locked");
    expect(state.canRead).toBe(false);
    expect(state.canWrite).toBe(false);
    expect(state.daysUntilPhaseChange).toBeNull();
    expect(state.phaseEndsAt).toBeNull();
  });
});

describe("resolveSubscriptionState — ACTIVE flow", () => {
  it("active with future currentPeriodEnd", () => {
    const state = resolveSubscriptionState(
      { status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: daysFromNow(10) },
      NOW,
    );
    expect(state.phase).toBe("active");
    expect(state.canWrite).toBe(true);
    expect(state.daysUntilPhaseChange).toBe(10);
  });

  it("ACTIVE with no currentPeriodEnd is treated as expired", () => {
    const state = resolveSubscriptionState(
      { status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: null },
      NOW,
    );
    expect(state.phase).toBe("expired");
    expect(state.canWrite).toBe(false);
  });

  it("ACTIVE past expiry enters grace", () => {
    const state = resolveSubscriptionState(
      { status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: daysAgo(1) },
      NOW,
    );
    expect(state.phase).toBe("grace");
    expect(state.canWrite).toBe(true);
  });

  it("uses default now when second argument is omitted", () => {
    const future = new Date(Date.now() + 10 * 86400_000);
    const state = resolveSubscriptionState({
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodEnd: future,
    });
    expect(state.phase).toBe("active");
  });
});
