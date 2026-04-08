import type { FastifyBaseLogger } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { resolveSubscriptionState } from "../lib/subscription-state";
import { sendOverdueNotice } from "../notifications/billing-notifier.service";

/**
 * Scans subscriptions whose period (or trial) has already expired and
 * emits notifications when transitioning into grace / soft-locked / hard-locked.
 *
 * The phase itself is derived at runtime, so no state mutation is needed.
 */
export async function runBillingEscalateJob(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
): Promise<number> {
  const now = new Date();

  const candidates = await prisma.subscription.findMany({
    where: {
      OR: [
        { status: "TRIAL", trialEndsAt: { lt: now } },
        { status: "ACTIVE", currentPeriodEnd: { lt: now } },
      ],
    },
  });

  let notified = 0;
  for (const sub of candidates) {
    try {
      const state = resolveSubscriptionState(sub, now);
      if (state.phase === "active" || state.phase === "trial") continue;

      await sendOverdueNotice(logger, sub, state);
      notified++;
    } catch (err) {
      logger.error(
        { err, subscriptionId: sub.id },
        "billing-escalate: failed to notify subscription",
      );
    }
  }

  return notified;
}
