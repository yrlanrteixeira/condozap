import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll } from "vitest";
import { createApp } from "../../src/app/app";
import { disconnectTestPrisma, truncateAll } from "./db";

let sharedApp: FastifyInstance | null = null;

export const getTestApp = async (): Promise<FastifyInstance> => {
  if (!sharedApp) {
    sharedApp = await createApp();
    await sharedApp.ready();
  }
  return sharedApp;
};

export const closeTestApp = async (): Promise<void> => {
  if (sharedApp) {
    await sharedApp.close();
    sharedApp = null;
  }
  await disconnectTestPrisma();
};

/**
 * Add setupIntegrationSuite() at the top of each integration test file.
 * Handles: boot app once, truncate DB between tests, close at the end.
 */
export const setupIntegrationSuite = (): void => {
  beforeAll(async () => {
    await getTestApp();
  });

  afterEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestApp();
  });
};
