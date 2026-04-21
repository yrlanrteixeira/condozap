import { afterEach, beforeAll, vi } from "vitest";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.test"), override: true });
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error(
      `REFUSING TO RUN: DATABASE_URL does not contain "test": ${process.env.DATABASE_URL}`
    );
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});
