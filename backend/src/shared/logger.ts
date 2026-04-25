/**
 * Global pino logger for places that lack a Fastify request/app context
 * (utils, prisma boot, side modules). Prefer `request.log` / `app.log`
 * inside route handlers — those carry the request id and pretty-print in
 * dev. This singleton is the fallback so we never reach for `console.*`.
 */
import pino, { type Logger } from "pino";

const isTest = process.env.NODE_ENV === "test";
const isDev = process.env.NODE_ENV === "development";

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isTest ? "silent" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
      }
    : undefined,
});
