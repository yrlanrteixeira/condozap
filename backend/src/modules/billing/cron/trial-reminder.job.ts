import type { FastifyBaseLogger } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { sendTrialExpiringNotice } from "../notifications/billing-notifier.service";

function addDays(date: Date, days: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

/**
 * Notifies syndicos whose trial ends in 3 / 1 / 0 days.
 */
export async function runTrialReminderJob(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
): Promise<number> {
  const now = new Date();
  const in3Days = addDays(now, 3);
  const tomorrow = addDays(now, 1);

  const candidates = await prisma.subscription.findMany({
    where: {
      status: "TRIAL",
      trialEndsAt: { gte: now, lte: in3Days },
    },
  });

  let notified = 0;
  for (const sub of candidates) {
    if (!sub.trialEndsAt) continue;
    try {
      const daysLeft =
        sub.trialEndsAt >= in3Days
          ? 3
          : sub.trialEndsAt >= tomorrow
            ? 1
            : 0;
      await sendTrialExpiringNotice(logger, sub, daysLeft);
      notified++;
    } catch (err) {
      logger.error(
        { err, subscriptionId: sub.id },
        "trial-reminder: failed to notify",
      );
    }
  }

  return notified;
}
