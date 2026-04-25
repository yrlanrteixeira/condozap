/**
 * Integration tests guarding the transactional behavior of
 * updateUserRole and removeUserFromCondominium.
 *
 * We don't simulate a partial-failure rollback (Prisma's $transaction
 * already provides ACID semantics — testing DB internals is out of scope).
 * What we lock in is the happy path: after wrapping the multi-write
 * operations in $transaction, the resulting state must remain identical
 * to the pre-fix behavior.
 */
import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { setupIntegrationSuite } from "../../../test/helpers/build-test-app";
import { getTestPrisma } from "../../../test/helpers/db";
import {
  makeCondominium,
  makeUser,
} from "../../../test/factories";
import {
  updateUserRole,
  removeUserFromCondominium,
} from "./users.service";

setupIntegrationSuite();

const silentLogger: any = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

describe("updateUserRole — transactional happy path", () => {
  it("updates User.role and shared UserCondominium.role atomically", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const caller = await makeUser({ role: UserRole.SYNDIC });
    const target = await makeUser({ role: UserRole.RESIDENT });

    await prisma.userCondominium.create({
      data: {
        userId: caller.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    await prisma.userCondominium.create({
      data: {
        userId: target.id,
        condominiumId: condo.id,
        role: UserRole.RESIDENT,
      },
    });

    await updateUserRole(
      prisma,
      silentLogger,
      { userId: target.id, newRole: "ADMIN" } as any,
      {
        id: caller.id,
        role: caller.role as string,
        allowedCondominiumIds: [condo.id],
      }
    );

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
    });
    const updatedLink = await prisma.userCondominium.findFirstOrThrow({
      where: { userId: target.id, condominiumId: condo.id },
    });

    expect(updatedUser.role).toBe("ADMIN");
    expect(updatedLink.role).toBe("ADMIN");
  });
});

describe("removeUserFromCondominium — transactional happy path", () => {
  it("removes link and suspends user atomically when it was the last condo", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const caller = await makeUser({ role: UserRole.SYNDIC });
    const target = await makeUser({ role: UserRole.RESIDENT });

    await prisma.userCondominium.create({
      data: {
        userId: caller.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    await prisma.userCondominium.create({
      data: {
        userId: target.id,
        condominiumId: condo.id,
        role: UserRole.RESIDENT,
      },
    });

    const result = await removeUserFromCondominium(
      prisma,
      silentLogger,
      { userId: target.id, condominiumId: condo.id } as any,
      {
        id: caller.id,
        role: caller.role as string,
        allowedCondominiumIds: [condo.id],
      }
    );

    expect(result.userSuspended).toBe(true);

    const link = await prisma.userCondominium.findFirst({
      where: { userId: target.id, condominiumId: condo.id },
    });
    expect(link).toBeNull();

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(user.status).toBe("SUSPENDED");
  });

  it("removes link without suspending when other memberships remain", async () => {
    const prisma = getTestPrisma();
    const condoA = await makeCondominium();
    const condoB = await makeCondominium();
    const caller = await makeUser({ role: UserRole.SYNDIC });
    const target = await makeUser({ role: UserRole.RESIDENT });

    await prisma.userCondominium.create({
      data: {
        userId: caller.id,
        condominiumId: condoA.id,
        role: UserRole.SYNDIC,
      },
    });
    await prisma.userCondominium.create({
      data: {
        userId: target.id,
        condominiumId: condoA.id,
        role: UserRole.RESIDENT,
      },
    });
    await prisma.userCondominium.create({
      data: {
        userId: target.id,
        condominiumId: condoB.id,
        role: UserRole.RESIDENT,
      },
    });

    const result = await removeUserFromCondominium(
      prisma,
      silentLogger,
      { userId: target.id, condominiumId: condoA.id } as any,
      {
        id: caller.id,
        role: caller.role as string,
        allowedCondominiumIds: [condoA.id],
      }
    );

    expect(result.userSuspended).toBe(false);

    const stillThere = await prisma.userCondominium.findFirst({
      where: { userId: target.id, condominiumId: condoB.id },
    });
    expect(stillThere).not.toBeNull();

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(user.status).not.toBe("SUSPENDED");
  });
});
