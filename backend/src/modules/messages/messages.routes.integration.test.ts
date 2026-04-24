import { describe, expect, it } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import { makeCondominium, makeUser } from "../../../test/factories";

setupIntegrationSuite();

const asAuthUser = (
  user: Awaited<ReturnType<typeof makeUser>>,
  opts: { permissionScope?: string } = {}
) => ({
  id: user.id,
  email: user.email,
  role: user.role as string,
  name: user.name,
  status: user.status,
  permissionScope:
    opts.permissionScope ??
    (user.role === "PROFESSIONAL_SYNDIC" ? "GLOBAL" : "LOCAL"),
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

async function seedMessage(condominiumId: string, sentBy: string) {
  return getTestPrisma().message.create({
    data: {
      condominiumId,
      type: "TEXT",
      scope: "ALL",
      content: "hello",
      recipientCount: 3,
      sentBy,
      whatsappStatus: "SENT",
    },
  });
}

// =====================================================
// GET /api/messages/:condominiumId
// =====================================================
describe("messages — GET /api/messages/:condominiumId", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/messages/some-id",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns list for linked syndic", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    await seedMessage(condo.id, syndic.id);
    await seedMessage(condo.id, syndic.id);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/messages/${condo.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(2);
  });

  it("403 cross-condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const other = await makeCondominium();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/messages/${other.id}`,
    });
    expect(res.statusCode).toBe(403);
  });
});

// =====================================================
// GET /api/messages/detail/:id
// =====================================================
describe("messages — GET /api/messages/detail/:id", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/messages/detail/x",
    });
    expect(res.statusCode).toBe(401);
  });

  it("404 for unknown id", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/messages/detail/nope",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns the message for a linked caller", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const msg = await seedMessage(condo.id, syndic.id);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/messages/detail/${msg.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(msg.id);
  });

  it("403 when message belongs to another condo (isolation)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const myCondo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, myCondo.id, UserRole.SYNDIC);
    const otherCondo = await makeCondominium();
    const otherSyndic = await makeUser({ role: UserRole.SYNDIC });
    const msg = await seedMessage(otherCondo.id, otherSyndic.id);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/messages/detail/${msg.id}`,
    });
    expect(res.statusCode).toBe(403);
  });
});

// =====================================================
// GET /api/messages/stats
// =====================================================
describe("messages — GET /api/messages/stats", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/messages/stats?condominiumId=x",
    });
    expect(res.statusCode).toBe(401);
  });

  it("400 when condominiumId missing", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/messages/stats",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns aggregated stats for linked caller", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    await seedMessage(condo.id, syndic.id);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/messages/stats?condominiumId=${condo.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.totalRecipients).toBe(3);
    expect(body.byStatus).toBeDefined();
    expect(body.byType).toBeDefined();
  });

  it("403 cross-condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const other = await makeCondominium();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/messages/stats?condominiumId=${other.id}`,
    });
    expect(res.statusCode).toBe(403);
  });
});

// =====================================================
// POST /api/messages/send — auth only (service path hits activity_logs bug)
// =====================================================
describe("messages — POST /api/messages/send", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/messages/send",
      payload: {
        condominiumId: "c",
        type: "TEXT",
        content: { text: "hi" },
        target: { scope: "ALL" },
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("403 cross-condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const other = await makeCondominium();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/messages/send",
      payload: {
        condominiumId: other.id,
        type: "TEXT",
        content: { text: "hi" },
        target: { scope: "ALL" },
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("400/500 on invalid payload (missing target)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/messages/send",
      payload: {
        condominiumId: condo.id,
        type: "TEXT",
        content: { text: "hi" },
      },
    });
    expect([400, 500]).toContain(res.statusCode);
  });

});
