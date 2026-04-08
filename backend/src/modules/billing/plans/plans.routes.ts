import type { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin } from "../../../auth/authorize";
import {
  createPlanHandler,
  deactivatePlanHandler,
  getPlanHandler,
  listActivePlansHandler,
  listAllPlansHandler,
  updatePlanHandler,
} from "./plans.controller";

export const plansRoutes: FastifyPluginAsync = async (fastify) => {
  // Public catalog — any authenticated user can see active plans
  // (for display on the /assinatura page)
  fastify.get(
    "/",
    { onRequest: [fastify.authenticate] },
    listActivePlansHandler,
  );

  // SUPER_ADMIN endpoints
  fastify.get(
    "/all",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    listAllPlansHandler,
  );

  fastify.get(
    "/:id",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    getPlanHandler,
  );

  fastify.post(
    "/",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    createPlanHandler,
  );

  fastify.patch(
    "/:id",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    updatePlanHandler,
  );

  fastify.delete(
    "/:id",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    deactivatePlanHandler,
  );
};
