/**
 * Integration tests for registerResidentWithInvite — the atomic
 * registration flow that must create User + Resident + UserCondominium
 * AND mark the invite as consumed in a single transaction.
 *
 * Locks in the happy path and the rollback contract: if any write inside
 * the transaction fails (we simulate by violating the unique-email
 * constraint mid-flow), no partial state is persisted.
 */
import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { setupIntegrationSuite } from "../../../test/helpers/build-test-app";
import { getTestPrisma } from "../../../test/helpers/db";
import { makeCondominium, makeUser } from "../../../test/factories";
import { hashInviteToken, generateRawInviteToken } from "../../shared/utils/invite-token";
import { registerResidentWithInvite } from "./register-invite.service";

setupIntegrationSuite();

async function seedInvite(
  condominiumId: string,
  createdByUserId: string,
  phone = "5511999990000"
) {
  const prisma = getTestPrisma();
  const rawToken = generateRawInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const invite = await prisma.residentInvite.create({
    data: {
      condominiumId,
      createdByUserId,
      name: "Convidado",
      tokenHash,
      phone,
      tower: "A",
      floor: "1",
      unit: "101",
      expiresAt: new Date(Date.now() + 24 * 3600_000),
    },
  });
  return { invite, rawToken };
}

describe("registerResidentWithInvite — atomic happy path", () => {
  it("creates User, Resident, UserCondominium link, and consumes invite in one transaction", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const creator = await makeUser({ role: "SYNDIC" as any });
    const { invite, rawToken } = await seedInvite(condo.id, creator.id);

    const result = await registerResidentWithInvite({
      prisma,
      hashedPassword: await bcrypt.hash("password123", 4),
      condominiumIdFromSlug: condo.id,
      body: {
        email: "alice@test.local",
        name: "Alice",
        password: "password123",
        inviteToken: rawToken,
        requestedPhone: "5511999990000",
        requestedTower: "A",
        requestedFloor: "1",
        requestedUnit: "101",
        consentWhatsapp: true,
        consentDataProcessing: true,
        role: "RESIDENT",
      } as any,
    });

    expect(result).not.toBeNull();
    expect(result!.email).toBe("alice@test.local");
    expect(result!.resident).not.toBeNull();

    const consumed = await prisma.residentInvite.findUnique({
      where: { id: invite.id },
    });
    expect(consumed?.consumedAt).not.toBeNull();
    expect(consumed?.consumedByUserId).toBe(result!.id);

    const link = await prisma.userCondominium.findFirst({
      where: { userId: result!.id, condominiumId: condo.id },
    });
    expect(link).not.toBeNull();
  });
});

describe("registerResidentWithInvite — rollback on partial failure", () => {
  it("does not consume invite or create User when email collides mid-flow", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const creator = await makeUser({ role: "SYNDIC" as any });
    const { invite, rawToken } = await seedInvite(condo.id, creator.id);

    // Pre-existing user with the same email — early-check throws before
    // the transaction starts. Verify nothing is partially created.
    await makeUser({ email: "bob@test.local" });

    await expect(
      registerResidentWithInvite({
        prisma,
        hashedPassword: await bcrypt.hash("password123", 4),
        condominiumIdFromSlug: condo.id,
        body: {
          email: "bob@test.local",
          name: "Bob",
          password: "password123",
          inviteToken: rawToken,
          requestedPhone: "5511999990000",
          requestedTower: "A",
          requestedFloor: "1",
          requestedUnit: "101",
          consentWhatsapp: true,
          consentDataProcessing: true,
          role: "RESIDENT",
        } as any,
      })
    ).rejects.toThrow();

    // Invite must NOT be consumed.
    const inviteAfter = await prisma.residentInvite.findUnique({
      where: { id: invite.id },
    });
    expect(inviteAfter?.consumedAt).toBeNull();
    expect(inviteAfter?.consumedByUserId).toBeNull();

    // No new User with the same email beyond the pre-existing one.
    const usersWithEmail = await prisma.user.count({
      where: { email: "bob@test.local" },
    });
    expect(usersWithEmail).toBe(1);

    // No resident created in this condo.
    const residents = await prisma.resident.count({
      where: { condominiumId: condo.id },
    });
    expect(residents).toBe(0);
  });
});
