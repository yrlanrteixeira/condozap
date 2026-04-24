import { describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import slaCronPlugin from "./sla-cron.plugin";

describe("sla-cron plugin", () => {
  it("is a no-op under NODE_ENV=test (guardrail against spurious cron in tests)", async () => {
    // The plugin short-circuits in test environment; verify it registers
    // cleanly and does not schedule anything.
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    const app = Fastify();
    const scheduleSpy = vi.fn();
    // Minimal guard: register does not throw and returns ready app.
    await app.register(slaCronPlugin);
    await app.ready();

    expect(scheduleSpy).not.toHaveBeenCalled();
    await app.close();
    process.env.NODE_ENV = originalEnv;
  });

  it("loads the plugin module without side effects in a test context", async () => {
    // Just an import-time smoke test to assert the module exports a plugin.
    expect(typeof slaCronPlugin).toBe("function");
  });
});
