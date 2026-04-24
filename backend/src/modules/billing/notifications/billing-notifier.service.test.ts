import { describe, expect, it, vi } from "vitest";
import type { FastifyBaseLogger } from "fastify";
import type { PaymentBill, Subscription } from "@prisma/client";
import {
  sendBillGeneratedNotice,
  sendOverdueNotice,
  sendPaymentConfirmation,
  sendTrialExpiringNotice,
} from "./billing-notifier.service";

const fakeLogger = (): FastifyBaseLogger => {
  const fn = vi.fn();
  return {
    info: fn,
    error: fn,
    warn: fn,
    debug: fn,
    trace: fn,
    fatal: fn,
    child: () => fakeLogger(),
    level: "info",
  } as unknown as FastifyBaseLogger;
};

const sub = { id: "sub_1", trialEndsAt: new Date("2026-05-01") } as Subscription;
const bill = { id: "bill_1", amountCents: 1000, periodEnd: new Date() } as PaymentBill;

describe("billing-notifier stubs", () => {
  it("sendBillGeneratedNotice logs with a bill_generated event tag", async () => {
    const l = fakeLogger();
    await sendBillGeneratedNotice(l, sub, bill);
    expect(l.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "billing.notify.bill_generated" }),
      expect.any(String),
    );
  });

  it("sendPaymentConfirmation logs payment_confirmed event", async () => {
    const l = fakeLogger();
    await sendPaymentConfirmation(l, sub, bill);
    expect(l.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "billing.notify.payment_confirmed" }),
      expect.any(String),
    );
  });

  it("sendTrialExpiringNotice logs daysLeft", async () => {
    const l = fakeLogger();
    await sendTrialExpiringNotice(l, sub, 3);
    expect(l.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "billing.notify.trial_expiring", daysLeft: 3 }),
      expect.any(String),
    );
  });

  it("sendOverdueNotice logs phase info", async () => {
    const l = fakeLogger();
    await sendOverdueNotice(l, sub, {
      phase: "soft_locked",
      canRead: true,
      canWrite: false,
      daysUntilPhaseChange: 2,
      phaseEndsAt: null,
    });
    expect(l.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "billing.notify.overdue", phase: "soft_locked" }),
      expect.any(String),
    );
  });
});
