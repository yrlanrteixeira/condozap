import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { config } from "../../config/env";

// Ajusta DATABASE_URL para compatibilidade com pgBouncer/Supabase
const getDatabaseUrl = (): string => {
  const baseUrl = process.env.DATABASE_URL || "";

  if (baseUrl.includes("supabase.co")) {
    const url = new URL(baseUrl);
    url.searchParams.set("pgbouncer", "true");
    url.searchParams.set("connection_limit", "1");
    return url.toString();
  }

  return baseUrl;
};

/** Usado em scripts (seed, clear) — cada um deve dar `$disconnect()` ao terminar. */
export function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: getDatabaseUrl(),
  });
  return new PrismaClient({
    adapter,
    log: config.isDev ? ["query", "error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (config.isDev) globalForPrisma.prisma = prisma;

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

if (!config.isDev) {
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error("❌ Prisma health check failed:", error);
    }
  }, 60000);
}
