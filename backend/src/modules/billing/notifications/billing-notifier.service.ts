import type { FastifyBaseLogger } from "fastify";
import type { PaymentBill, Subscription } from "@prisma/client";
import type { SubscriptionState } from "../lib/subscription-state";

/**
 * Billing notifications.
 *
 * These functions are STUBS for the MVP. They emit structured logs today.
 * Integration with the email provider and the WhatsApp (messaging) module
 * should be added in a follow-up — see the billing design spec §6.
 *
 * They are isolated here so that wiring real senders later is a single-file
 * change that does not touch the cron jobs or the webhook handler.
 */

export async function sendBillGeneratedNotice(
  logger: FastifyBaseLogger,
  subscription: Subscription,
  bill: PaymentBill,
): Promise<void> {
  logger.info(
    {
      event: "billing.notify.bill_generated",
      subscriptionId: subscription.id,
      billId: bill.id,
      amountCents: bill.amountCents,
      periodEnd: bill.periodEnd,
    },
    "billing: bill generated — user should be notified",
  );
  // TODO(billing-notifier): send email + WhatsApp with checkout link
}

export async function sendPaymentConfirmation(
  logger: FastifyBaseLogger,
  subscription: Subscription,
  bill: PaymentBill,
): Promise<void> {
  logger.info(
    {
      event: "billing.notify.payment_confirmed",
      subscriptionId: subscription.id,
      billId: bill.id,
      amountCents: bill.amountCents,
    },
    "billing: payment confirmed — user should be notified",
  );
  // TODO(billing-notifier): send confirmation email + WhatsApp
}

export async function sendTrialExpiringNotice(
  logger: FastifyBaseLogger,
  subscription: Subscription,
  daysLeft: number,
): Promise<void> {
  logger.info(
    {
      event: "billing.notify.trial_expiring",
      subscriptionId: subscription.id,
      daysLeft,
      trialEndsAt: subscription.trialEndsAt,
    },
    "billing: trial expiring — user should be notified",
  );
  // TODO(billing-notifier): send trial-ending reminder
}

export async function sendOverdueNotice(
  logger: FastifyBaseLogger,
  subscription: Subscription,
  state: SubscriptionState,
): Promise<void> {
  logger.info(
    {
      event: "billing.notify.overdue",
      subscriptionId: subscription.id,
      phase: state.phase,
      daysUntilPhaseChange: state.daysUntilPhaseChange,
    },
    "billing: subscription overdue — user should be notified",
  );
  // TODO(billing-notifier): send overdue notice + escalating WhatsApp messages
}
