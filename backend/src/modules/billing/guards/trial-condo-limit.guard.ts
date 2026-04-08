import type { FastifyReply, FastifyRequest } from "fastify";
import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "../../../shared/db/prisma";
import type { AuthUser } from "../../../types/auth";
import { trialCondoLimitError } from "../lib/errors";

/**
 * Maximum number of condominiums a syndic can manage during their trial.
 * After the trial, there is no limit — the cycle amount simply scales with
 * the number of condominiums (per the pricing tiers).
 */
export const TRIAL_CONDO_LIMIT = 3;

/**
 * Enforces TRIAL_CONDO_LIMIT on condominium creation.
 * Only activated when the current user has a TRIAL subscription.
 *
 * Apply to `POST /condominiums` only.
 */
export async function trialCondoLimitGuard(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const user = request.user as AuthUser | undefined;

  // SUPER_ADMIN can create condominiums without any subscription check
  if (user?.role === "SUPER_ADMIN") return;
  if (!user) return; // auth guard will catch this

  const sub = await prisma.subscription.findUnique({
    where: { syndicId: user.id },
  });

  // No subscription (e.g. non-syndic user) — not our concern here
  if (!sub) return;

  // Limit only applies during TRIAL. After that, pricing tiers handle scaling.
  if (sub.status !== SubscriptionStatus.TRIAL) return;

  const current = await prisma.condominium.count({
    where: { primarySyndicId: user.id },
  });

  if (current >= TRIAL_CONDO_LIMIT) {
    throw trialCondoLimitError(current, TRIAL_CONDO_LIMIT);
  }
}
