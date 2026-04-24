import { describe, expect, it, vi, beforeEach } from "vitest";
import { UserRole } from "@prisma/client";
import { mockEvolutionService } from "../../../test/mocks/evolution-client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { makeUser } from "../../../test/factories";

setupIntegrationSuite();

beforeEach(() => {
  vi.clearAllMocks();
});

const asAuthUser = (user: Awaited<ReturnType<typeof makeUser>>) => ({
  id: user.id,
  email: user.email,
  role: user.role as string,
  name: user.name,
  status: user.status,
  permissionScope: "LOCAL",
});

describe("evolution — GET /api/evolution/status", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/api/evolution/status" });
    expect(res.statusCode).toBe(401);
  });

  it("returns connected state from evolutionService", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    mockEvolutionService.getInstanceState.mockResolvedValueOnce({
      instance: { instanceName: "test-inst", state: "open" },
    });

    const res = await authedInject(app, asAuthUser(u), {
      method: "GET",
      url: "/api/evolution/status",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.connected).toBe(true);
    expect(body.instanceName).toBe("test-inst");
  });

  it("500 when evolutionService throws", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    mockEvolutionService.getInstanceState.mockRejectedValueOnce(
      new Error("boom")
    );
    const res = await authedInject(app, asAuthUser(u), {
      method: "GET",
      url: "/api/evolution/status",
    });
    expect(res.statusCode).toBe(500);
    expect(res.json().connected).toBe(false);
  });
});

describe("evolution — GET /api/evolution/qrcode", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/api/evolution/qrcode" });
    expect(res.statusCode).toBe(401);
  });

  it("returns qrcode payload", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    mockEvolutionService.getQRCode.mockResolvedValueOnce({
      base64: "data:image/png;base64,abc",
      code: "x",
      pairingCode: "111",
      count: 1,
    });
    const res = await authedInject(app, asAuthUser(u), {
      method: "GET",
      url: "/api/evolution/qrcode",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().qrcode).toContain("data:image/png");
  });
});

describe("evolution — POST /api/evolution/disconnect + /restart", () => {
  it("POST /disconnect returns ok when mocked", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    mockEvolutionService.disconnect.mockResolvedValueOnce({
      status: "disconnected",
    });
    const res = await authedInject(app, asAuthUser(u), {
      method: "POST",
      url: "/api/evolution/disconnect",
    });
    expect(res.statusCode).toBe(200);
    expect(mockEvolutionService.disconnect).toHaveBeenCalled();
  });

  it("POST /restart returns ok when mocked", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    mockEvolutionService.restart.mockResolvedValueOnce({ status: "restarted" });
    const res = await authedInject(app, asAuthUser(u), {
      method: "POST",
      url: "/api/evolution/restart",
    });
    expect(res.statusCode).toBe(200);
    expect(mockEvolutionService.restart).toHaveBeenCalled();
  });
});

describe("evolution — POST /api/evolution/send", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/evolution/send",
      payload: { phone: "x", message: "m" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("sends and returns messageId when mocked", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    mockEvolutionService.sendText.mockResolvedValueOnce({
      key: { id: "evo-xx", remoteJid: "x", fromMe: true },
    });

    const res = await authedInject(app, asAuthUser(u), {
      method: "POST",
      url: "/api/evolution/send",
      payload: { phone: "5511987654321", message: "hi" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().messageId).toBe("evo-xx");
  });

  it("500 when evolution throws", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    mockEvolutionService.sendText.mockRejectedValueOnce(new Error("bad"));

    const res = await authedInject(app, asAuthUser(u), {
      method: "POST",
      url: "/api/evolution/send",
      payload: { phone: "5511987654321", message: "hi" },
    });
    expect(res.statusCode).toBe(500);
  });
});

describe("evolution — POST /api/evolution/check-numbers", () => {
  it("maps evolution results to {number,onWhatsApp,jid}", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    mockEvolutionService.checkNumbers.mockResolvedValueOnce([
      { number: "5511987654321", onWhatsapp: true, jid: "x@s.whatsapp.net" },
    ]);

    const res = await authedInject(app, asAuthUser(u), {
      method: "POST",
      url: "/api/evolution/check-numbers",
      payload: { numbers: ["5511987654321"] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.results[0]).toEqual({
      number: "5511987654321",
      onWhatsApp: true,
      jid: "x@s.whatsapp.net",
    });
  });
});

// =====================================================
// POST /api/evolution/webhook (inbound, shared-secret protected)
// =====================================================
const EVO_KEY = "test-evolution-key"; // from .env.test EVOLUTION_API_KEY

describe("evolution — POST /api/evolution/webhook (inbound)", () => {
  it("accepts MESSAGES_UPSERT and returns received:true", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/evolution/webhook",
      headers: { apikey: EVO_KEY },
      payload: {
        event: "MESSAGES_UPSERT",
        instance: "test",
        data: {
          key: { remoteJid: "55@s.whatsapp.net", fromMe: false, id: "m1" },
          pushName: "Jo",
          message: { conversation: "oi" },
        },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().received).toBe(true);
  });

  it("accepts CONNECTION_UPDATE", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/evolution/webhook",
      headers: { apikey: EVO_KEY },
      payload: {
        event: "CONNECTION_UPDATE",
        instance: "test",
        data: { state: "open" },
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it("accepts unknown event types gracefully", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/evolution/webhook",
      headers: { apikey: EVO_KEY },
      payload: {
        event: "UNKNOWN_EVENT",
        instance: "test",
        data: {},
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it("ignores fromMe messages (no persistence)", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/evolution/webhook",
      headers: { apikey: EVO_KEY },
      payload: {
        event: "MESSAGES_UPSERT",
        instance: "test",
        data: {
          key: { remoteJid: "55@s.whatsapp.net", fromMe: true, id: "m2" },
          message: { conversation: "me sending" },
        },
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it("returns 401 when shared secret header is missing", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/evolution/webhook",
      payload: {
        event: "CONNECTION_UPDATE",
        instance: "test",
        data: { state: "open" },
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 when shared secret is wrong", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/evolution/webhook",
      headers: { apikey: "bogus" },
      payload: {
        event: "CONNECTION_UPDATE",
        instance: "test",
        data: { state: "open" },
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("accepts x-evolution-token header as alternative", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/evolution/webhook",
      headers: { "x-evolution-token": EVO_KEY },
      payload: {
        event: "CONNECTION_UPDATE",
        instance: "test",
        data: { state: "open" },
      },
    });
    expect(res.statusCode).toBe(200);
  });
});

// =====================================================
// Role guards on operational endpoints (item 2)
// =====================================================
describe("evolution — role guards on operational endpoints", () => {
  it("RESIDENT receives 403 on POST /disconnect", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(u), {
      method: "POST",
      url: "/api/evolution/disconnect",
    });
    expect(res.statusCode).toBe(403);
  });

  it("RESIDENT receives 403 on POST /restart", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(u), {
      method: "POST",
      url: "/api/evolution/restart",
    });
    expect(res.statusCode).toBe(403);
  });

  it("RESIDENT receives 403 on POST /send", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(u), {
      method: "POST",
      url: "/api/evolution/send",
      payload: { phone: "5511987654321", message: "hi" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("RESIDENT receives 403 on POST /check-numbers", async () => {
    const app = await getTestApp();
    const u = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(u), {
      method: "POST",
      url: "/api/evolution/check-numbers",
      payload: { numbers: ["5511987654321"] },
    });
    expect(res.statusCode).toBe(403);
  });

  // Happy path with SUPER_ADMIN already covered above in
  // "evolution — POST /api/evolution/disconnect + /restart". Avoiding SYNDIC
  // happy-path here because the global subscription guard intercepts SYNDICs
  // without a TRIAL/active sub (returns 402) — that's tested in billing/.
});
