import { describe, expect, it } from "vitest";
import { CondominiumStatus, UserRole } from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { getTestPrisma } from "../../../test/helpers/db";
import { makeCondominium, makeUser } from "../../../test/factories";
import {
  generateRawInviteToken,
  hashInviteToken,
} from "../../shared/utils/invite-token";

setupIntegrationSuite();

describe("public — GET /api/public/condominiums/:slug (anonymous)", () => {
  it("returns 404 for unknown slug", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/public/condominiums/does-not-exist",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for invalid slug (empty normalized)", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/public/condominiums/@@@",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns public condo info without exposing sensitive fields", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium({
      slug: "my-public-condo",
      status: CondominiumStatus.ACTIVE,
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/public/condominiums/my-public-condo",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(condo.id);
    expect(body.slug).toBe("my-public-condo");
    expect(body.registrationOpen).toBe(true);
    // Should not leak CNPJ or primarySyndicId
    expect(body).not.toHaveProperty("cnpj");
    expect(body).not.toHaveProperty("primarySyndicId");
    expect(body).not.toHaveProperty("whatsappPhone");
  });

  it("returns registrationOpen=false when suspended", async () => {
    const app = await getTestApp();
    await makeCondominium({
      slug: "suspended-condo",
      status: CondominiumStatus.SUSPENDED,
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/public/condominiums/suspended-condo",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().registrationOpen).toBe(false);
  });
});

async function seedInvite(opts: {
  consumed?: boolean;
  expired?: boolean;
}) {
  const prisma = getTestPrisma();
  const creator = await makeUser({ role: UserRole.SYNDIC });
  const condo = await makeCondominium({
    slug: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  });
  const raw = generateRawInviteToken();
  await prisma.residentInvite.create({
    data: {
      condominiumId: condo.id,
      createdByUserId: creator.id,
      tokenHash: hashInviteToken(raw),
      name: "João",
      phone: "+5511999999999",
      tower: "A",
      floor: "3",
      unit: "301",
      expiresAt: opts.expired
        ? new Date(Date.now() - 86400_000)
        : new Date(Date.now() + 86400_000),
      consumedAt: opts.consumed ? new Date() : null,
    },
  });
  return { raw, condo };
}

describe("public — GET /api/public/register-invites/:token (anonymous)", () => {
  it("returns 404 for unknown token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/public/register-invites/totally-fake-token",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns invite data for valid non-consumed token", async () => {
    const app = await getTestApp();
    const { raw, condo } = await seedInvite({});

    const res = await app.inject({
      method: "GET",
      url: `/api/public/register-invites/${raw}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.condominiumId).toBe(condo.id);
    expect(body.condominiumSlug).toBe(condo.slug);
    expect(body.name).toBe("João");
    expect(body.registrationOpen).toBe(true);
    expect(body).not.toHaveProperty("tokenHash");
  });

  it("returns 410 for consumed invite", async () => {
    const app = await getTestApp();
    const { raw } = await seedInvite({ consumed: true });
    const res = await app.inject({
      method: "GET",
      url: `/api/public/register-invites/${raw}`,
    });
    expect(res.statusCode).toBe(410);
  });

  it("returns 410 for expired invite", async () => {
    const app = await getTestApp();
    const { raw } = await seedInvite({ expired: true });
    const res = await app.inject({
      method: "GET",
      url: `/api/public/register-invites/${raw}`,
    });
    expect(res.statusCode).toBe(410);
  });
});
