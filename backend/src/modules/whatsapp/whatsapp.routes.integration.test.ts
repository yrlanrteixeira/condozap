import crypto from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import { mockEvolutionService } from "../../../test/mocks/evolution-client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import { makeCondominium, makeUser } from "../../../test/factories";
import { config } from "../../config/env";

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

const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86400_000);

async function makeSyndicWithSub() {
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  await getTestPrisma().subscription.create({
    data: {
      syndicId: syndic.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: addDays(new Date(), 30),
    },
  });
  return syndic;
}

async function linkUserToCondo(
  userId: string,
  condominiumId: string,
  role: UserRole
) {
  return getTestPrisma().userCondominium.create({
    data: { userId, condominiumId, role },
  });
}

// =====================================================
// GET /api/whatsapp/webhook — verification (Meta flow)
// =====================================================
describe("whatsapp — GET /api/whatsapp/webhook (verify)", () => {
  it("returns the challenge when mode+token match config", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
        config.WHATSAPP_WEBHOOK_VERIFY_TOKEN
      )}&hub.challenge=abc123`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("abc123");
  });

  it("403 when token does not match", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc",
    });
    expect(res.statusCode).toBe(403);
  });
});

// =====================================================
// POST /api/whatsapp/webhook — status updates + HMAC validation
// =====================================================
const signMetaPayload = (payload: unknown): { raw: string; signature: string } => {
  const raw = JSON.stringify(payload);
  const digest = crypto
    .createHmac("sha256", config.WHATSAPP_APP_SECRET as string)
    .update(raw)
    .digest("hex");
  return { raw, signature: `sha256=${digest}` };
};

describe("whatsapp — POST /api/whatsapp/webhook (status updates)", () => {
  it("accepts empty payload (no statuses) when signature is valid", async () => {
    const app = await getTestApp();
    const { raw, signature } = signMetaPayload({});
    const res = await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      payload: raw,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });

  it("updates message status from a status entry when signature is valid", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const msg = await prisma.message.create({
      data: {
        condominiumId: condo.id,
        type: "TEXT",
        scope: "UNIT",
        content: "hi",
        recipientCount: 1,
        sentBy: syndic.id,
        whatsappStatus: "SENT",
        whatsappMessageId: "wamid.TESTID",
      },
    });

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: "wamid.TESTID", status: "delivered" }],
              },
            },
          ],
        },
      ],
    };
    const { raw, signature } = signMetaPayload(payload);
    const res = await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      payload: raw,
    });
    expect(res.statusCode).toBe(200);

    const updated = await prisma.message.findUnique({ where: { id: msg.id } });
    expect(updated?.whatsappStatus).toBe("DELIVERED");
  });

  it("returns 200 but does NOT process when x-hub-signature-256 is missing", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const msg = await prisma.message.create({
      data: {
        condominiumId: condo.id,
        type: "TEXT",
        scope: "UNIT",
        content: "hi",
        recipientCount: 1,
        sentBy: syndic.id,
        whatsappStatus: "SENT",
        whatsappMessageId: "wamid.NOSIG",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [{ id: "wamid.NOSIG", status: "delivered" }],
                },
              },
            ],
          },
        ],
      }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);

    const after = await prisma.message.findUnique({ where: { id: msg.id } });
    expect(after?.whatsappStatus).toBe("SENT"); // unchanged
  });

  it("returns 200 but does NOT process when signature is wrong", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const msg = await prisma.message.create({
      data: {
        condominiumId: condo.id,
        type: "TEXT",
        scope: "UNIT",
        content: "hi",
        recipientCount: 1,
        sentBy: syndic.id,
        whatsappStatus: "SENT",
        whatsappMessageId: "wamid.BADSIG",
      },
    });

    const payload = JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: "wamid.BADSIG", status: "delivered" }],
              },
            },
          ],
        },
      ],
    });
    // a syntactically-valid but wrong digest
    const wrong = "sha256=" + "f".repeat(64);

    const res = await app.inject({
      method: "POST",
      url: "/api/whatsapp/webhook",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": wrong,
      },
      payload,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);

    const after = await prisma.message.findUnique({ where: { id: msg.id } });
    expect(after?.whatsappStatus).toBe("SENT"); // unchanged
  });
});

// =====================================================
// POST /api/whatsapp/send
// =====================================================
describe("whatsapp — POST /api/whatsapp/send", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/whatsapp/send",
      payload: { to: "x", message: "m", condominiumId: "c" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("403 cross-condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const other = await makeCondominium();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/whatsapp/send",
      payload: {
        to: "11987654321",
        message: "hi",
        condominiumId: other.id,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("sends a message via evolution and persists the record", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    mockEvolutionService.sendText.mockResolvedValueOnce({
      key: { id: "wamid.SENTX", remoteJid: "x", fromMe: true },
      status: "PENDING",
      message: { conversation: "mock" },
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/whatsapp/send",
      payload: {
        to: "11987654321",
        message: "hello world",
        condominiumId: condo.id,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
    expect(res.json().messageId).toBe("wamid.SENTX");
    expect(mockEvolutionService.sendText).toHaveBeenCalledTimes(1);

    const persisted = await getTestPrisma().message.findFirst({
      where: { condominiumId: condo.id, whatsappMessageId: "wamid.SENTX" },
    });
    expect(persisted).not.toBeNull();
  });

  it("returns 500 when evolution throws (error propagated)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    mockEvolutionService.sendText.mockRejectedValueOnce(
      new Error("network down")
    );

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/whatsapp/send",
      payload: {
        to: "11987654321",
        message: "hi",
        condominiumId: condo.id,
      },
    });
    expect(res.statusCode).toBe(500);
  });
});

// =====================================================
// POST /api/whatsapp/send-bulk
// =====================================================
describe("whatsapp — POST /api/whatsapp/send-bulk", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/whatsapp/send-bulk",
      payload: { condominiumId: "c", recipients: [], message: "m" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("sends bulk via evolution and returns aggregate counts", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    mockEvolutionService.sendBatch.mockResolvedValueOnce({
      total: 2,
      sent: 2,
      failed: 0,
      results: [
        { number: "5511987654321", success: true, messageId: "b1" },
        { number: "5511987654322", success: true, messageId: "b2" },
      ],
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/whatsapp/send-bulk",
      payload: {
        condominiumId: condo.id,
        recipients: [
          { phone: "11987654321", name: "A" },
          { phone: "11987654322", name: "B" },
        ],
        message: "hi all",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(2);
    expect(body.sent).toBe(2);
    expect(mockEvolutionService.sendBatch).toHaveBeenCalledTimes(1);
  });
});
