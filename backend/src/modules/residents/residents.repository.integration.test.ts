/**
 * Repository-level isolation tests for findResidentByIdForUser.
 *
 * Asserts that the function filters by the caller's allowed condominium IDs
 * (via AccessContext) — non-global callers cannot read residents from condos
 * they do not have membership in. This is the contract relied upon by the
 * controller to return 404/403 across tenant boundaries.
 */
import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { setupIntegrationSuite } from "../../../test/helpers/build-test-app";
import { getTestPrisma } from "../../../test/helpers/db";
import {
  makeCondominium,
  makeResident,
  makeUser,
} from "../../../test/factories";
import { findResidentByIdForUser } from "./residents.repository";

setupIntegrationSuite();

const asAuth = (u: Awaited<ReturnType<typeof makeUser>>, scope = "LOCAL") => ({
  id: u.id,
  email: u.email,
  role: u.role as string,
  name: u.name,
  status: u.status,
  permissionScope: scope as any,
});

describe("findResidentByIdForUser — cross-condo isolation", () => {
  it("returns null when resident is in a condo outside caller's scope", async () => {
    const prisma = getTestPrisma();
    const callerCondo = await makeCondominium();
    const otherCondo = await makeCondominium();
    const caller = await makeUser({ role: UserRole.SYNDIC });
    await prisma.userCondominium.create({
      data: {
        userId: caller.id,
        condominiumId: callerCondo.id,
        role: UserRole.SYNDIC,
      },
    });

    const targetResident = await makeResident({ condominiumId: otherCondo.id });

    const result = await findResidentByIdForUser(
      prisma,
      asAuth(caller) as any,
      targetResident.id
    );

    expect(result).toBeNull();
  });

  it("returns the resident when it lives in caller's allowed condo", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const caller = await makeUser({ role: UserRole.SYNDIC });
    await prisma.userCondominium.create({
      data: {
        userId: caller.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const resident = await makeResident({ condominiumId: condo.id });

    const result = await findResidentByIdForUser(
      prisma,
      asAuth(caller) as any,
      resident.id
    );

    expect(result).not.toBeNull();
    expect(result!.id).toBe(resident.id);
  });

  it("global-scope caller (PROFESSIONAL_SYNDIC + GLOBAL) sees residents in any condo", async () => {
    const prisma = getTestPrisma();
    const otherCondo = await makeCondominium();
    const caller = await makeUser({ role: UserRole.PROFESSIONAL_SYNDIC });
    const resident = await makeResident({ condominiumId: otherCondo.id });

    const result = await findResidentByIdForUser(
      prisma,
      asAuth(caller, "GLOBAL") as any,
      resident.id
    );

    expect(result).not.toBeNull();
    expect(result!.id).toBe(resident.id);
  });
});
