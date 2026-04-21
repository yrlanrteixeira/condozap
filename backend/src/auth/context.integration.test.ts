import { UserRole, PermissionScope } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { setupIntegrationSuite } from "../../test/helpers/build-test-app";
import { getTestPrisma } from "../../test/helpers/db";
import {
  makeCondominium,
  makeSector,
  makeUser,
} from "../../test/factories";
import {
  isCondominiumAllowed,
  resolveAccessContext,
} from "./context";

setupIntegrationSuite();

describe("resolveAccessContext", () => {
  it("returns GLOBAL scope without querying memberships when user has GLOBAL scope", async () => {
    const user = await makeUser({
      role: UserRole.PROFESSIONAL_SYNDIC,
      permissionScope: PermissionScope.GLOBAL,
    });
    const ctx = await resolveAccessContext(getTestPrisma(), {
      id: user.id,
      role: "PROFESSIONAL_SYNDIC",
      permissionScope: "GLOBAL",
    });
    expect(ctx).toEqual({
      role: "PROFESSIONAL_SYNDIC",
      scope: "GLOBAL",
      allowedCondominiumIds: [],
      allowedSectorIds: [],
    });
  });

  it("defaults PROFESSIONAL_SYNDIC to GLOBAL when permissionScope is undefined", async () => {
    const user = await makeUser({ role: UserRole.PROFESSIONAL_SYNDIC });
    const ctx = await resolveAccessContext(getTestPrisma(), {
      id: user.id,
      role: "PROFESSIONAL_SYNDIC",
    });
    expect(ctx.scope).toBe("GLOBAL");
  });

  it("defaults other roles to LOCAL scope", async () => {
    const user = await makeUser({ role: UserRole.SYNDIC });
    const ctx = await resolveAccessContext(getTestPrisma(), {
      id: user.id,
      role: "SYNDIC",
    });
    expect(ctx.scope).toBe("LOCAL");
    expect(ctx.allowedCondominiumIds).toEqual([]);
    expect(ctx.allowedSectorIds).toEqual([]);
  });

  it("collects allowed condominiums/sectors from memberships", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const otherCondo = await makeCondominium();
    const user = await makeUser({ role: UserRole.SETOR_MEMBER });

    await p.userCondominium.create({
      data: {
        userId: user.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
      },
    });

    const sector = await makeSector({ condominiumId: condo.id });
    // Sector in a condo the user is NOT a member of — should be filtered out.
    const otherSector = await makeSector({ condominiumId: otherCondo.id });

    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: user.id, isActive: true },
    });
    await p.sectorMember.create({
      data: { sectorId: otherSector.id, userId: user.id, isActive: true },
    });
    // inactive membership should be ignored
    const inactiveSector = await makeSector({ condominiumId: condo.id });
    await p.sectorMember.create({
      data: {
        sectorId: inactiveSector.id,
        userId: user.id,
        isActive: false,
      },
    });

    const ctx = await resolveAccessContext(p, {
      id: user.id,
      role: "SETOR_MEMBER",
      permissionScope: "LOCAL",
    });

    expect(ctx.allowedCondominiumIds).toEqual([condo.id]);
    expect(ctx.allowedSectorIds).toEqual([sector.id]);
    expect(ctx.assignedTower).toBeNull();
  });

  it("populates assignedTower when the user has a council position with tower", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const user = await makeUser({ role: UserRole.ADMIN });

    await p.userCondominium.create({
      data: {
        userId: user.id,
        condominiumId: condo.id,
        role: UserRole.ADMIN,
        councilPosition: "Conselheiro",
        assignedTower: "A",
      },
    });

    const ctx = await resolveAccessContext(p, {
      id: user.id,
      role: "ADMIN",
      permissionScope: "LOCAL",
    });
    expect(ctx.assignedTower).toBe("A");
  });

  it("dedupes repeated condominium IDs from memberships", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const user = await makeUser();
    await p.userCondominium.create({
      data: {
        userId: user.id,
        condominiumId: condo.id,
        role: UserRole.RESIDENT,
      },
    });

    const ctx = await resolveAccessContext(p, {
      id: user.id,
      role: "RESIDENT",
    });
    expect(ctx.allowedCondominiumIds).toEqual([condo.id]);
  });
});

describe("isCondominiumAllowed", () => {
  it("always true when scope is GLOBAL", () => {
    expect(
      isCondominiumAllowed(
        {
          role: "PROFESSIONAL_SYNDIC",
          scope: "GLOBAL",
          allowedCondominiumIds: [],
          allowedSectorIds: [],
        },
        "any-condo"
      )
    ).toBe(true);
  });

  it("true when condominium is in the allow list (LOCAL)", () => {
    expect(
      isCondominiumAllowed(
        {
          role: "SYNDIC",
          scope: "LOCAL",
          allowedCondominiumIds: ["c-1"],
          allowedSectorIds: [],
        },
        "c-1"
      )
    ).toBe(true);
  });

  it("false when condominium is not in the allow list (LOCAL)", () => {
    expect(
      isCondominiumAllowed(
        {
          role: "SYNDIC",
          scope: "LOCAL",
          allowedCondominiumIds: ["c-1"],
          allowedSectorIds: [],
        },
        "c-2"
      )
    ).toBe(false);
  });
});
