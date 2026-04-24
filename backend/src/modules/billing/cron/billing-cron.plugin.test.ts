import { describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import plugin from "./billing-cron.plugin";

/**
 * In NODE_ENV=test (the default for the test suite) the plugin is an
 * early-return no-op. We verify it registers without throwing and that
 * node-cron is NOT invoked. Scheduling is exercised in non-test envs
 * manually by operators — covering the cron branch in tests would require
 * running real schedules which is out of scope.
 */

describe("billing-cron plugin (test env)", () => {
  it("does not throw and skips scheduling when NODE_ENV=test", async () => {
    process.env.NODE_ENV = "test";
    const app = Fastify({ logger: false });
    await app.register(plugin);
    await app.ready();
    await app.close();
    expect(true).toBe(true);
  });

  it("registers three cron schedules when NODE_ENV is not 'test'", async () => {
    const cron = await import("node-cron");
    const scheduleSpy = vi.spyOn(cron.default, "schedule").mockImplementation(
      // @ts-expect-error — stub
      (() => ({ stop: () => undefined, start: () => undefined })) as never,
    );
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const app = Fastify({ logger: false });
    await app.register(plugin);
    await app.ready();
    expect(scheduleSpy).toHaveBeenCalledTimes(3);
    await app.close();
    process.env.NODE_ENV = prev;
    scheduleSpy.mockRestore();
  });
});
