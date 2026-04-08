import type { FastifyReply, FastifyRequest } from "fastify";
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
import { findOwningSyndic, type OwningSyndicStrategy } from "./find-owning-syndic";

type Handler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

function makeHandler(strategy: OwningSyndicStrategy): Handler {
  return async (request, _reply) => {
    const user = request.user as AuthUser | undefined;

    // SUPER_ADMIN bypasses everything
    if (user?.role === "SUPER_ADMIN") return;

    // Reads are always allowed — even soft_locked users can view data
    if (request.method === "GET" || request.method === "HEAD") return;

    const syndicId = await findOwningSyndic(request, strategy);
    // If we can't resolve a syndic the guard doesn't apply
    // (e.g. an auth-only route or a route for which this strategy is a no-op).
    if (!syndicId) return;

    const sub = await prisma.subscription.findUnique({
      where: { syndicId },
    });

    if (!sub) {
      throw noSubscriptionError();
    }

    const state = resolveSubscriptionState(sub);
    if (state.canWrite) return;

    // Map phase → specific error
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
  };
}

/**
 * Factory for building `onRequest` preHandlers that enforce an active
 * subscription. The strategy defines where the "owning syndic" comes from.
 *
 * Usage:
 *   fastify.post("/:condominiumId/sectors", {
 *     onRequest: [
 *       fastify.authenticate,
 *       subscriptionGuard.forCondominiumParam("condominiumId"),
 *     ],
 *   }, handler);
 */
export const subscriptionGuard = {
  /**
   * Use when the authenticated user IS the syndic who owns the subscription
   * (e.g. "PATCH /users/me" or a route gated to syndicos).
   */
  forCurrentUser(): Handler {
    return makeHandler({ kind: "current-user" });
  },

  /**
   * Use when the route has a condominium id in the path. The guard looks up
   * the condominium's primarySyndicId and gates on that syndic's subscription.
   */
  forCondominiumParam(paramName: string): Handler {
    return makeHandler({ kind: "condo-param", paramName });
  },

  /**
   * Use when the authenticated user is a non-syndic (e.g. sector member)
   * whose actions are billed to their condominium's primary syndic.
   */
  forUserLink(): Handler {
    return makeHandler({ kind: "user-link" });
  },
};
