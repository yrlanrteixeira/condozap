import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { registerGlobalBillingHook } from "./global-subscription.hook";

describe("registerGlobalBillingHook", () => {
  it("adds a preHandler hook to the given fastify instance", async () => {
    const app = Fastify({ logger: false });
    registerGlobalBillingHook(app);
    // Register a bogus route; the hook should at least be callable as
    // a no-op on GET / (read), returning normally.
    app.get("/x", async () => ({ ok: true }));
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/x" });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
