import type { FastifyBaseLogger } from "fastify";
import type { PrismaClient } from "@prisma/client";
import * as billService from "../bills/bills.service";
import { sendBillGeneratedNotice } from "../notifications/billing-notifier.service";

function addDays(date: Date, days: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

/**
 * Finds ACTIVE subscriptions whose currentPeriodEnd is 4–6 days away and
 * generates a new PIX bill for the next cycle, then sends a reminder.
 *
 * Idempotency: if a PENDING bill already exists for the subscription, skip.
 */
export async function runBillingReminderJob(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
): Promise<number> {
  const now = new Date();
  const lower = addDays(now, 4);
  const upper = addDays(now, 6);

  const candidates = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { gte: lower, lte: upper },
    },
  });

  let processed = 0;
  for (const sub of candidates) {
    try {
      const pending = await prisma.paymentBill.findFirst({
        where: { subscriptionId: sub.id, status: "PENDING" },
      });
      if (pending) continue;

      const bill = await billService.createPixBillForCurrentCycle(prisma, sub.syndicId);
      await sendBillGeneratedNotice(logger, sub, bill);
      processed++;
    } catch (err) {
      logger.error(
        { err, syndicId: sub.syndicId, subscriptionId: sub.id },
        "billing-reminder: failed to process subscription",
      );
    }
  }

  return processed;
}
