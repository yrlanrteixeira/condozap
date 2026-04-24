import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyRawBody from "fastify-raw-body";
import { config } from "../config/env";
import authPlugin from "../plugins/auth";
import ssePlugin from "../plugins/sse";
import { createErrorHandler } from "../shared/middlewares/errorHandler";
import { authRoutes } from "../modules/auth";
import { complaintsRoutes } from "../modules/complaints";
import { residentsRoutes } from "../modules/residents/residents.routes";
import { messagesRoutes } from "../modules/messages/messages.routes";
import { whatsappRoutes } from "../modules/whatsapp/whatsapp.routes";
import { dashboardRoutes } from "../modules/dashboard";
import { userApprovalRoutes } from "../modules/user-approval/user-approval.routes";
import { userManagementRoutes } from "../modules/user-management/user-management.routes";
import { evolutionRoutes } from "../modules/evolution";
import { condominiumsRoutes } from "../modules/condominiums";
import { historyRoutes } from "../modules/history/history.routes";
import { structureRoutes } from "../modules/structure/structure.routes";
import { uploadRoutes } from "../modules/uploads/upload.routes";
import { platformRoutes } from "../modules/platform/platform.routes";
import { notificationRoutes } from "../modules/notifications/notifications.routes";
import { complaintChatRoutes } from "../modules/complaints/complaints-chat.routes";
import { announcementRoutes } from "../modules/announcements/announcements.routes";
import { reportRoutes } from "../modules/reports/reports.routes";
import { cannedResponsesRoutes } from "../modules/canned-responses/canned-responses.routes";
import { sectorDashboardRoutes } from "../modules/sector-dashboard/sector-dashboard.routes";
import { billingRoutes } from "../modules/billing";
import { publicRoutes } from "../modules/public";
import { registerGlobalBillingHook } from "../modules/billing/guards/global-subscription.hook";
import slaCronPlugin from "../modules/sla-cron/sla-cron.plugin";
import billingCronPlugin from "../modules/billing/cron/billing-cron.plugin";

export const createApp = async (): Promise<FastifyInstance> => {
  const fastify = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.isDev
        ? {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
        : undefined,
    },
  });

  await fastify.register(cors, {
    origin: true, // Permite todas as origens
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type"],
    preflight: true,
    strictPreflight: false,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: config.isDev ? false : undefined,
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
  });

  await fastify.register(authPlugin);

  // SSE para notificações em tempo real
  await fastify.register(ssePlugin);

  // Capture raw body (opt-in per route via { config: { rawBody: true } }).
  // Required by the WhatsApp/Meta webhook to verify the x-hub-signature-256
  // HMAC against the exact bytes Meta signed.
  await fastify.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: false, // Buffer (HMAC operates on bytes)
    runFirst: true,
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  const healthPayload = async () => ({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });

  fastify.get("/health", healthPayload);
  /** Alias útil se CDN/proxy tiver regra de redirect só em `/health` (evita loop 301→mesma URL). */
  fastify.get("/api/health", healthPayload);

  await fastify.register(publicRoutes, { prefix: "/api/public" });

  // Global billing enforcement: register hook BEFORE all operational routes
  // so it propagates into their encapsulated plugin scopes. Fastify only
  // applies parent hooks to children whose register() runs AFTER addHook().
  registerGlobalBillingHook(fastify);

  await fastify.register(authRoutes, { prefix: "/api/auth" });
  await fastify.register(userApprovalRoutes, { prefix: "/api" });
  await fastify.register(userManagementRoutes, { prefix: "/api" });
  await fastify.register(complaintsRoutes, { prefix: "/api/complaints" });
  await fastify.register(residentsRoutes, { prefix: "/api/residents" });
  await fastify.register(messagesRoutes, { prefix: "/api/messages" });
  await fastify.register(whatsappRoutes, { prefix: "/api/whatsapp" });
  await fastify.register(evolutionRoutes, { prefix: "/api/evolution" });
  await fastify.register(dashboardRoutes, { prefix: "/api/dashboard" });
  await fastify.register(condominiumsRoutes, { prefix: "/api/condominiums" });
  await fastify.register(historyRoutes, { prefix: "/api/history" });
  await fastify.register(structureRoutes, { prefix: "/api/structure" });
  await fastify.register(uploadRoutes, { prefix: "/api/uploads" });
  await fastify.register(platformRoutes, { prefix: "/api/platform" });
  await fastify.register(notificationRoutes, { prefix: "/api/notifications" });
  await fastify.register(complaintChatRoutes, { prefix: "/api/complaint-messages" });
  await fastify.register(announcementRoutes, { prefix: "/api/announcements" });
  await fastify.register(reportRoutes, { prefix: "/api/reports" });
  await fastify.register(cannedResponsesRoutes, { prefix: "/api/canned-responses" });
  await fastify.register(sectorDashboardRoutes, { prefix: "/api/sector-dashboard" });
  await fastify.register(billingRoutes, { prefix: "/api/billing" });

  await fastify.register(slaCronPlugin);
  await fastify.register(billingCronPlugin);

  fastify.setErrorHandler(createErrorHandler(fastify.log));

  return fastify;
};
