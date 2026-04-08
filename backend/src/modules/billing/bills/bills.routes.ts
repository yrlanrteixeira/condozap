import type { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin } from "../../../auth/authorize";
import {
  createCardBillHandler,
  createManualBillHandler,
  createPixBillHandler,
  listBillsForSyndicHandler,
  listMyBillsHandler,
} from "./bills.controller";

export const billsRoutes: FastifyPluginAsync = async (fastify) => {
  // Syndic self-service
  fastify.post(
    "/pix",
    { onRequest: [fastify.authenticate] },
    createPixBillHandler,
  );

  fastify.post(
    "/card",
    { onRequest: [fastify.authenticate] },
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
