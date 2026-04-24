import {
  CondominiumPermissionMode,
  UserRole,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { setupIntegrationSuite } from "../../test/helpers/build-test-app";
import { getTestPrisma } from "../../test/helpers/db";
import {
  makeCondominium,
  makeSector,
  makeUser,
} from "../../test/factories";
import {
  getEffectivePermissionsForCondominiumMembership,
  getEffectivePermissionsForCondominiums,
} from "./effective-permissions";
import { getRoleCeiling } from "./role-permissions";

setupIntegrationSuite();

describe("getEffectivePermissionsForCondominiums", () => {
  it("returns an empty map for an empty input", async () => {
    const result = await getEffectivePermissionsForCondominiums(
      getTestPrisma(),
      "any-user",
      []
    );
    expect(result.size).toBe(0);
  });

  it("returns [] for a condominium the user does not belong to", async () => {
    const condo = await makeCondominium();
    const user = await makeUser();
    const result = await getEffectivePermissionsForCondominiums(
      getTestPrisma(),
      user.id,
      [condo.id]
    );
    expect(result.get(condo.id)).toEqual([]);
  });

  it("SYNDIC / PROFESSIONAL_SYNDIC receive the full role ceiling, ignoring custom perms", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const user = await makeUser({ role: UserRole.SYNDIC });
    const uc = await p.userCondominium.create({
      data: {
        userId: user.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
        permissionMode: CondominiumPermissionMode.CUSTOM,
      },
    });
    await p.userCondominiumPermission.create({
      data: { userCondominiumId: uc.id, action: "totally:custom" },
    });
    const result = await getEffectivePermissionsForCondominiums(
      p,
      user.id,
      [condo.id]
    );
    const ceiling = getRoleCeiling(UserRole.SYNDIC);
    expect(result.get(condo.id)).toEqual(ceiling);
  });

  it("ROLE_DEFAULT without sector memberships returns the full ceiling", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const user = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.userCondominium.create({
      data: {
        userId: user.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
        permissionMode: CondominiumPermissionMode.ROLE_DEFAULT,
      },
    });
    const result = await getEffectivePermissionsForCondominiums(
      p,
      user.id,
      [condo.id]
    );
    expect(result.get(condo.id)).toEqual(
      getRoleCeiling(UserRole.SETOR_MEMBER)
    );
  });

  it("ROLE_DEFAULT intersects ceiling with the union of sector perms when sectors exist", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const user = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.userCondominium.create({
      data: {
        userId: user.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
        permissionMode: CondominiumPermissionMode.ROLE_DEFAULT,
      },
    });
    const sector = await makeSector({ condominiumId: condo.id });
    const sm = await p.sectorMember.create({
      data: { sectorId: sector.id, userId: user.id, isActive: true },
    });
    await p.sectorPermission.createMany({
      data: [
        { sectorId: sector.id, action: "view:complaints" },
        { sectorId: sector.id, action: "comment:complaint" },
        // not in sector member's ceiling → will be filtered
        { sectorId: sector.id, action: "totally:fake" },
      ],
    });
    // override: grant update:complaint_status and revoke comment:complaint
    await p.sectorMemberPermissionOverride.createMany({
      data: [
        {
          sectorMemberId: sm.id,
          action: "update:complaint_status",
          granted: true,
        },
        {
          sectorMemberId: sm.id,
          action: "comment:complaint",
          granted: false,
        },
      ],
    });
    const result = await getEffectivePermissionsForCondominiums(
      p,
      user.id,
      [condo.id]
    );
    const perms = result.get(condo.id) ?? [];
    expect(perms).toContain("view:complaints");
    expect(perms).toContain("update:complaint_status");
    expect(perms).not.toContain("comment:complaint");
    expect(perms).not.toContain("totally:fake");
  });

  it("CUSTOM mode unions custom+sector perms and intersects with ceiling", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const user = await makeUser({ role: UserRole.SETOR_MEMBER });
    const uc = await p.userCondominium.create({
      data: {
        userId: user.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
        permissionMode: CondominiumPermissionMode.CUSTOM,
      },
    });
    await p.userCondominiumPermission.createMany({
      data: [
        { userCondominiumId: uc.id, action: "view:complaints" },
        // outside ceiling → filtered
        { userCondominiumId: uc.id, action: "manage:syndics" },
      ],
    });
    const sector = await makeSector({ condominiumId: condo.id });
    const sm = await p.sectorMember.create({
      data: { sectorId: sector.id, userId: user.id, isActive: true },
    });
    await p.sectorPermission.create({
      data: { sectorId: sector.id, action: "comment:complaint" },
    });
    // override granting an extra key on top of sector perms
    await p.sectorMemberPermissionOverride.create({
      data: {
        sectorMemberId: sm.id,
        action: "update:complaint_status",
        granted: true,
      },
    });
    const result = await getEffectivePermissionsForCondominiums(
      p,
      user.id,
      [condo.id]
    );
    const perms = result.get(condo.id) ?? [];
    expect(perms).toContain("view:complaints");
    expect(perms).toContain("comment:complaint");
    expect(perms).toContain("update:complaint_status");
    expect(perms).not.toContain("manage:syndics");
  });

  it("dedupes repeated condominium IDs in the input", async () => {
    const condo = await makeCondominium();
    const user = await makeUser();
    const result = await getEffectivePermissionsForCondominiums(
      getTestPrisma(),
      user.id,
      [condo.id, condo.id, condo.id]
    );
    expect(result.size).toBe(1);
  });
});

describe("getEffectivePermissionsForCondominiumMembership", () => {
  it("returns [] when there is no membership for that condominium", async () => {
    const condo = await makeCondominium();
    const user = await makeUser();
    const perms = await getEffectivePermissionsForCondominiumMembership(
      getTestPrisma(),
      user.id,
      condo.id
    );
    expect(perms).toEqual([]);
  });

  it("delegates to getEffectivePermissionsForCondominiums", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const user = await makeUser({ role: UserRole.SYNDIC });
    await p.userCondominium.create({
      data: {
        userId: user.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const perms = await getEffectivePermissionsForCondominiumMembership(
      p,
      user.id,
      condo.id
    );
    expect(perms).toEqual(getRoleCeiling(UserRole.SYNDIC));
  });
});
