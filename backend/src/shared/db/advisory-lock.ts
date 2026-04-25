import type { PrismaClient } from "@prisma/client";

/**
 * Run `fn` while holding a Postgres advisory lock identified by `key`.
 * If the lock is already held by another session, returns `null`
 * immediately without invoking `fn` — useful to make scheduled jobs
 * safe against overlapping invocations across multiple processes/pods.
 *
 * Always releases the lock in a finally block. The same numeric key
 * must be used by every caller that needs to coordinate.
 */
export async function withAdvisoryLock<T>(
  prisma: PrismaClient,
  key: number,
  fn: () => Promise<T>
): Promise<T | null> {
  const acquired = await prisma.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
    SELECT pg_try_advisory_lock(${key}::bigint)
  `;
  if (!acquired?.[0]?.pg_try_advisory_lock) {
    return null;
  }
  try {
    return await fn();
  } finally {
    try {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(${key}::bigint)`;
    } catch {
      // best-effort release — if the connection is already closed, the
      // lock is auto-released by Postgres on session end.
    }
  }
}

/** Stable advisory-lock keys for known background jobs. */
export const ADVISORY_LOCK_KEYS = {
  SLA_CRON: 49_120_001,
  ACCOUNT_EXPIRATION: 49_120_002,
} as const;
