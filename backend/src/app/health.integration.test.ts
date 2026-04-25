/**
 * Integration tests for the deep readiness probe.
 *
 * /health remains a shallow liveness check (always 200 if the process is
 * alive). /health/ready additionally probes the DB so an orchestrator
 * doesn't route traffic to a pod whose Postgres connection is broken.
 */
import { describe, expect, it } from "vitest";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../test/helpers/build-test-app";

setupIntegrationSuite();

describe("GET /health (shallow)", () => {
  it("returns 200 with status=ok", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toEqual(expect.any(String));
  });
});

describe("GET /health/ready (deep)", () => {
  it("returns 200 + db=ok when Postgres is reachable", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/health/ready" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ready");
    expect(body.db).toBe("ok");
  });

  it("/api/health/ready alias also returns ready", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/health/ready",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ready");
  });
});
