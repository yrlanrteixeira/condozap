import { describe, expect, it } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import {
  makeCondominium,
  makeSector,
  makeUser,
} from "../../../test/factories";

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

describe("structure — GET /api/structure/:condominiumId", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/structure/any",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for outside user", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const outsider = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(outsider), {
      method: "GET",
      url: `/api/structure/${condo.id}`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns the structure for syndic member", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/structure/${condo.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.condominiumId).toBe(condo.id);
    expect(body.structure).toBeDefined();
  });
});

describe("structure — PATCH /api/structure/:condominiumId", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/structure/any",
      payload: { structure: { towers: [] } },
    });
    expect(res.statusCode).toBe(401);
  });

  it("updates structure for syndic", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/structure/${condo.id}`,
      payload: {
        structure: {
          towers: [
            { name: "A", floors: ["1", "2"], unitsPerFloor: 2 },
          ],
        },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().structure.towers).toHaveLength(1);
  });
});

describe("structure — sectors CRUD", () => {
  it("lists sectors (empty) for member", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/structure/${condo.id}/sectors`,
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("returns public categories anonymously", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    await makeSector({
      condominiumId: condo.id,
      categories: ["barulho", "limpeza"],
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/structure/${condo.id}/public/categories`,
    });
    expect(res.statusCode).toBe(200);
  });

  it("returns 403 on POST for non-syndic", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    await prisma.userCondominium.create({
      data: {
        userId: resident.id,
        condominiumId: condo.id,
        role: UserRole.RESIDENT,
      },
    });

    const res = await authedInject(app, asAuthUser(resident), {
      method: "POST",
      url: `/api/structure/${condo.id}/sectors`,
      payload: { name: "Novo Setor", categories: [] },
    });
    expect(res.statusCode).toBe(403);
  });

  it("creates a sector for syndic", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: `/api/structure/${condo.id}/sectors`,
      payload: { name: "Manutenção", categories: ["manutencao"] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe("Manutenção");
  });

  it("updates a sector", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const sector = await makeSector({ condominiumId: condo.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/structure/${condo.id}/sectors/${sector.id}`,
      payload: { name: "Novo Nome" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Novo Nome");
  });

  it("deletes a sector", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const sector = await makeSector({ condominiumId: condo.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "DELETE",
      url: `/api/structure/${condo.id}/sectors/${sector.id}`,
    });
    expect(res.statusCode).toBe(200);
  });
});
