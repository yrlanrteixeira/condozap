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

const asAuthUser = (u: Awaited<ReturnType<typeof makeUser>>) => ({
  id: u.id,
  email: u.email,
  role: u.role as string,
  name: u.name,
  status: u.status,
  permissionScope: u.permissionScope,
});

const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86400_000);

async function setupSyndicWithCondo() {
  const prisma = getTestPrisma();
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  const condo = await makeCondominium({ primarySyndicId: syndic.id });
  await prisma.userCondominium.create({
    data: { userId: syndic.id, condominiumId: condo.id, role: UserRole.SYNDIC },
  });
  await prisma.subscription.create({
    data: {
      syndicId: syndic.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: addDays(new Date(), 30),
    },
  });
  return { syndic, condo };
}

describe("announcements — GET /api/announcements/:condominiumId", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/announcements/some-condo",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 when caller is outside the condominium", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const outsider = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(outsider), {
      method: "GET",
      url: `/api/announcements/${condo.id}`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("lists announcements (empty) for member", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/announcements/${condo.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ announcements: [], nextCursor: null });
  });
});

describe("announcements — POST /api/announcements", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/announcements",
      payload: { condominiumId: "x", title: "Aviso", content: "conteudo longo" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for non-syndic", async () => {
    const app = await getTestApp();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(resident), {
      method: "POST",
      url: "/api/announcements",
      payload: { condominiumId: "x", title: "Aviso", content: "conteudo longo" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 400 on short title", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/announcements",
      payload: { condominiumId: condo.id, title: "ab", content: "conteudo longo" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 on missing condominiumId", async () => {
    const app = await getTestApp();
    const { syndic } = await setupSyndicWithCondo();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/announcements",
      payload: { title: "Aviso", content: "conteudo longo e valido" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 403 when syndic is not member of condo", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await prisma.subscription.create({
      data: {
        syndicId: syndic.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(new Date(), 30),
      },
    });
    const other = await makeCondominium();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/announcements",
      payload: {
        condominiumId: other.id,
        title: "Aviso",
        content: "conteudo longo suficiente",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("creates an announcement (201)", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/announcements",
      payload: {
        condominiumId: condo.id,
        title: "Aviso Importante",
        content: "Conteúdo do aviso com pelo menos 10 chars.",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.title).toBe("Aviso Importante");
    expect(body.createdBy).toBe(syndic.id);
  });
});

describe("announcements — DELETE /api/announcements/:id", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/announcements/anything",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 404 when announcement does not exist", async () => {
    const app = await getTestApp();
    const { syndic } = await setupSyndicWithCondo();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "DELETE",
      url: "/api/announcements/does-not-exist",
    });
    expect(res.statusCode).toBe(404);
  });

  it("deletes when called by syndic of the condo", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const { syndic, condo } = await setupSyndicWithCondo();

    const now = new Date();
    const ann = await prisma.announcement.create({
      data: {
        condominiumId: condo.id,
        title: "T",
        content: "Content long enough",
        scope: "ALL",
        createdBy: syndic.id,
        startsAt: now,
        endsAt: addDays(now, 30),
      },
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "DELETE",
      url: `/api/announcements/${ann.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });
});
