import type { FastifyPluginAsync } from "fastify";
import { requireRole, requireSuperAdmin } from "../../../auth/authorize";
import {
  createCardBillHandler,
  createManualBillHandler,
  createPixBillHandler,
  listBillsForSyndicHandler,
  listMyBillsHandler,
} from "./bills.controller";

const requireSyndic = () =>
  requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]);

export const billsRoutes: FastifyPluginAsync = async (fastify) => {
  // Syndic self-service — only syndicos can generate their own cycle bills.
  // (SUPER_ADMIN uses the manual bill endpoint instead.)
  fastify.post(
    "/pix",
    { onRequest: [fastify.authenticate, requireSyndic()] },
    createPixBillHandler,
  );

  fastify.post(
    "/card",
    { onRequest: [fastify.authenticate, requireSyndic()] },
    createCardBillHandler,
  );

  fastify.get(
    "/me",
    { onRequest: [fastify.authenticate] },
    listMyBillsHandler,
  );

  // SUPER_ADMIN
  fastify.get(
    "/syndic/:syndicId",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    listBillsForSyndicHandler,
  );

  fastify.post(
    "/manual/:syndicId",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    createManualBillHandler,
  );
};
