/**
 * Integration tests for withAdvisoryLock — uses the real Postgres test
 * container so we exercise pg_try_advisory_lock semantics end to end.
 *
 * Asserts that two concurrent acquisitions of the same key are mutually
 * exclusive: one runs the payload, the other returns null (skipped).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTestPrisma } from "../../../test/helpers/db";
import { withAdvisoryLock } from "./advisory-lock";

const KEY = 999_999_001;

// We need a SECOND, independent prisma connection to actually contend on
// the advisory lock — pg_try_advisory_lock is per-session, and Prisma's
// internal connection pool means two awaits on the same client may end
// up on the same session.
let other: PrismaClient | null = null;

beforeAll(async () => {
  const url = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString: url });
  other = new PrismaClient({ adapter });
  await other.$connect();
});

afterAll(async () => {
  if (other) {
    await other.$disconnect();
  }
});

describe("withAdvisoryLock", () => {
  it("returns the payload result when the lock is free", async () => {
    const prisma = getTestPrisma();
    const result = await withAdvisoryLock(prisma, KEY, async () => 42);
    expect(result).toBe(42);
  });

  it("returns null when the lock is already held by another session", async () => {
    const prisma = getTestPrisma();

    // Acquire via the secondary client and hold it open.
    const acquired = await other!.$queryRaw<
      Array<{ pg_try_advisory_lock: boolean }>
    >`SELECT pg_try_advisory_lock(${KEY}::bigint)`;
    expect(acquired[0].pg_try_advisory_lock).toBe(true);

    try {
      let ran = false;
      const result = await withAdvisoryLock(prisma, KEY, async () => {
        ran = true;
        return "should-not-run";
      });
      expect(result).toBeNull();
      expect(ran).toBe(false);
    } finally {
      await other!.$queryRaw`SELECT pg_advisory_unlock(${KEY}::bigint)`;
    }
  });

  it("releases the lock so subsequent calls succeed", async () => {
    const prisma = getTestPrisma();
    const a = await withAdvisoryLock(prisma, KEY, async () => "a");
    const b = await withAdvisoryLock(prisma, KEY, async () => "b");
    expect(a).toBe("a");
    expect(b).toBe("b");
  });
});
