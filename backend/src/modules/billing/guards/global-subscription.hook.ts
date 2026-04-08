import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../shared/db/prisma";
import type { AuthUser } from "../../../types/auth";
import {
  cancelledError,
  hardLockedError,
  noSubscriptionError,
  softLockedError,
  trialExpiredError,
} from "../lib/errors";
import { resolveSubscriptionState } from "../lib/subscription-state";

/**
 * URL prefixes that represent operational endpoints within a condominium.
 * Writes to these endpoints require the owning syndic's subscription to
 * be in a writable phase (trial/active/grace).
 *
 * Intentionally excluded:
 *   /api/auth        — login/logout must work regardless of billing
 *   /api/billing     — the billing module itself
 *   /api/platform    — SUPER_ADMIN only, and SA bypasses the guard anyway
 *   /api/condominiums — guarded by trialCondoLimitGuard on POST, read-only otherwise
 *   /api/user-approval, /api/users — user management lives outside the pay wall
 *   /api/uploads      — shared infra
 *   /api/reports      — read-only historical data
 *   /api/history      — read-only
 *   /api/dashboard    — read-only
 *   /api/sector-dashboard — read-only
 *   /api/notifications — read-only
 */
const OPERATIONAL_PREFIXES = [
  "/api/complaints",
  "/api/complaint-messages",
  "/api/residents",
  "/api/messages",
  "/api/whatsapp",
  "/api/evolution",
  "/api/announcements",
  "/api/structure",
  "/api/canned-responses",
] as const;

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function matchesOperationalPrefix(url: string): boolean {
  for (const prefix of OPERATIONAL_PREFIXES) {
    if (url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves the syndic who should be billed for a given authenticated user:
 * - If they are a SYNDIC / PROFESSIONAL_SYNDIC, it's themselves
 * - Otherwise, look up their UserCondominium link and return the
 *   primarySyndicId of that condominium
 * Returns null if no owner can be resolved (in which case the guard is a no-op).
 */
async function resolveBilledSyndic(user: AuthUser): Promise<string | null> {
  if (user.role === "SYNDIC" || user.role === "PROFESSIONAL_SYNDIC") {
    return user.id;
  }

  const link = await prisma.userCondominium.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { condominiumId: true },
  });
  if (!link) return null;

  const condo = await prisma.condominium.findUnique({
    where: { id: link.condominiumId },
    select: { primarySyndicId: true },
  });
  return condo?.primarySyndicId ?? null;
}

/**
 * Global preHandler: runs for every request that reached preHandler stage.
 * Applies the subscription guard only to write operations on operational
 * endpoints. Runs AFTER route-level authentication (onRequest stage).
 */
async function globalSubscriptionHook(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  if (!WRITE_METHODS.has(request.method)) return;
  if (!matchesOperationalPrefix(request.url)) return;

  const user = request.user as AuthUser | undefined;
  // Unauthenticated requests are rejected by the route's own auth guard.
  // If we're here with no user, the route either doesn't require auth
  // (and thus isn't operational in the billing sense) or the auth guard
  // will deal with it.
  if (!user) return;

  // SUPER_ADMIN always bypasses billing
  if (user.role === "SUPER_ADMIN") return;

  const syndicId = await resolveBilledSyndic(user);
  if (!syndicId) return; // no owning syndic to gate on

  const sub = await prisma.subscription.findUnique({
    where: { syndicId },
  });

  if (!sub) {
    // A syndic with no subscription has never been backfilled or provisioned —
    // block by default. Non-syndic users with no resolvable owner are handled
    // above (null syndicId branch).
    throw noSubscriptionError();
  }

  const state = resolveSubscriptionState(sub);
  if (state.canWrite) return;

  switch (state.phase) {
    case "cancelled":
      throw cancelledError();
    case "expired":
    case "trial":
      throw trialExpiredError();
    case "soft_locked":
      throw softLockedError();
    case "hard_locked":
      throw hardLockedError();
    default:
      throw softLockedError();
  }
}

/**
 * Register the global billing hook. Call once, after all routes have been
 * registered, so the hook fires after route-level onRequest guards.
 */
export function registerGlobalBillingHook(fastify: FastifyInstance): void {
  fastify.addHook("preHandler", globalSubscriptionHook);
}
