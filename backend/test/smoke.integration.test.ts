import { describe, expect, it } from "vitest";
import { getTestApp, setupIntegrationSuite } from "./helpers/build-test-app";

setupIntegrationSuite();

describe("smoke", () => {
  it("app boots via createApp()", async () => {
    const app = await getTestApp();
    expect(app).toBeDefined();
    expect(typeof app.inject).toBe("function");
  });

  it("rejects a protected route without authentication", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/api/complaints" });
    // Must not be 200 — protected route should reject without token.
    expect(res.statusCode).not.toBe(200);
    expect([401, 403, 404]).toContain(res.statusCode);
  });
});
