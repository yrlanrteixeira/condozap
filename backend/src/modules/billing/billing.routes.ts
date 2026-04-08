import type { FastifyPluginAsync } from "fastify";
import { billsRoutes } from "./bills/bills.routes";
import { plansRoutes } from "./plans/plans.routes";
import { subscriptionsRoutes } from "./subscriptions/subscriptions.routes";
import { abacatepayWebhookRoutes } from "./webhooks/abacatepay.webhook.routes";

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(plansRoutes, { prefix: "/plans" });
  await fastify.register(subscriptionsRoutes, { prefix: "/subscriptions" });
  await fastify.register(billsRoutes, { prefix: "/bills" });
  await fastify.register(abacatepayWebhookRoutes, { prefix: "/webhooks" });
};
