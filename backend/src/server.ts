import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { config } from "./config/env.js";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.routes.js";
import { complaintsRoutes } from "./routes/complaints.routes.js";
import { residentsRoutes } from "./routes/residents.routes.js";
import { messagesRoutes } from "./routes/messages.routes.js";
import { whatsappRoutes } from "./routes/whatsapp.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { userApprovalRoutes } from "./routes/user-approval.routes.js";
import { userManagementRoutes } from "./routes/user-management.routes.js";
import { evolutionRoutes } from "./routes/evolution.routes.js";

// Create Fastify instance
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

// Register plugins
await fastify.register(cors, {
  origin: config.CORS_ORIGIN,
  credentials: true,
});

await fastify.register(helmet, {
  contentSecurityPolicy: config.isDev ? false : undefined,
});

await fastify.register(rateLimit, {
  max: 100, // 100 requests
  timeWindow: "1 minute",
});

await fastify.register(jwt, {
  secret: config.JWT_SECRET,
});

// Register authentication plugin
await fastify.register(authPlugin);

await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Health check
fastify.get("/health", async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  };
});

// Register routes
await fastify.register(authRoutes, { prefix: "/api/auth" });
await fastify.register(userApprovalRoutes, { prefix: "/api" });
await fastify.register(userManagementRoutes, { prefix: "/api" });
await fastify.register(complaintsRoutes, { prefix: "/api/complaints" });
await fastify.register(residentsRoutes, { prefix: "/api/residents" });
await fastify.register(messagesRoutes, { prefix: "/api/messages" });
await fastify.register(whatsappRoutes, { prefix: "/api/whatsapp" });
await fastify.register(evolutionRoutes, { prefix: "/api/evolution" });
await fastify.register(dashboardRoutes, { prefix: "/api/dashboard" });

// Error handler
fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error);

  const statusCode = (error as any).statusCode || 500;
  const message = (error as any).message || "Internal Server Error";

  reply.status(statusCode).send({
    error: {
      message,
      statusCode,
    },
  });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({
      port: config.PORT,
      host: config.HOST,
    });

    fastify.log.info(
      `🚀 Server listening on http://${config.HOST}:${config.PORT}`
    );
    fastify.log.info(`📝 Environment: ${config.NODE_ENV}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
