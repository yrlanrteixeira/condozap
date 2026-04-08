import type { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin } from "../../../auth/authorize";
import {
  assignPlanHandler,
  cancelSubscriptionHandler,
  extendTrialHandler,
  getMySubscriptionHandler,
  getPlatformMetricsHandler,
  getSubscriptionHandler,
  listSubscriptionsHandler,
  reactivateSubscriptionHandler,
} from "./subscriptions.controller";

export const subscriptionsRoutes: FastifyPluginAsync = async (fastify) => {
  // Current user's subscription (syndic self-service view)
  fastify.get(
    "/me",
    { onRequest: [fastify.authenticate] },
    getMySubscriptionHandler,
  );

  // SUPER_ADMIN: platform-wide metrics
  fastify.get(
    "/platform/metrics",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    getPlatformMetricsHandler,
  );

  // SUPER_ADMIN: list all subscriptions
  fastify.get(
    "/",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    listSubscriptionsHandler,
  );

  // SUPER_ADMIN: view a specific syndic's subscription
  fastify.get(
    "/:syndicId",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    getSubscriptionHandler,
  );

  // SUPER_ADMIN actions
  fastify.post(
    "/:syndicId/extend-trial",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    extendTrialHandler,
  );

  fastify.post(
    "/:syndicId/cancel",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    cancelSubscriptionHandler,
  );

  fastify.post(
    "/:syndicId/reactivate",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    reactivateSubscriptionHandler,
  );

  fastify.post(
    "/:syndicId/assign-plan",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    assignPlanHandler,
  );
};
