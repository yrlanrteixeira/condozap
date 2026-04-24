import { describe, expect, it } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import { getTestPrisma } from "../../../../test/helpers/db";
import { setupIntegrationSuite } from "../../../../test/helpers/build-test-app";
import { makeCondominium, makeUser } from "../../../../test/factories";
import { TRIAL_CONDO_LIMIT, trialCondoLimitGuard } from "./trial-condo-limit.guard";
import type { FastifyReply, FastifyRequest } from "fastify";

setupIntegrationSuite();

const fakeReply = () => ({}) as FastifyReply;
const asReq = (user: unknown): FastifyRequest => ({ user } as unknown as FastifyRequest);

describe("trialCondoLimitGuard", () => {
  it("exposes the TRIAL_CONDO_LIMIT constant", () => {
    expect(TRIAL_CONDO_LIMIT).toBe(3);
  });

  it("no-op when unauthenticated", async () => {
    await expect(trialCondoLimitGuard(asReq(undefined), fakeReply())).resolves.toBeUndefined();
  });

  it("no-op for SUPER_ADMIN", async () => {
    await expect(
      trialCondoLimitGuard(asReq({ id: "sa", role: "SUPER_ADMIN" }), fakeReply()),
    ).resolves.toBeUndefined();
  });

  it("no-op when user has no subscription", async () => {
    const user = await makeUser({ role: UserRole.SYNDIC });
    await expect(
      trialCondoLimitGuard(asReq({ id: user.id, role: user.role }), fakeReply()),
    ).resolves.toBeUndefined();
  });

  it("no-op when subscription is not TRIAL (e.g. ACTIVE)", async () => {
    const user = await makeUser({ role: UserRole.SYNDIC });
    await getTestPrisma().subscription.create({
      data: { syndicId: user.id, status: SubscriptionStatus.ACTIVE },
    });
    for (let i = 0; i < 10; i++) {
      await makeCondominium({ primarySyndicId: user.id });
    }
    await expect(
      trialCondoLimitGuard(asReq({ id: user.id, role: user.role }), fakeReply()),
    ).resolves.toBeUndefined();
  });

  it("allows creation when under the limit in TRIAL", async () => {
    const user = await makeUser({ role: UserRole.SYNDIC });
    await getTestPrisma().subscription.create({
      data: { syndicId: user.id, status: SubscriptionStatus.TRIAL },
    });
    await makeCondominium({ primarySyndicId: user.id });
    await expect(
      trialCondoLimitGuard(asReq({ id: user.id, role: user.role }), fakeReply()),
    ).resolves.toBeUndefined();
  });

  it("throws TRIAL_CONDO_LIMIT when current >= limit in TRIAL", async () => {
    const user = await makeUser({ role: UserRole.SYNDIC });
    await getTestPrisma().subscription.create({
      data: { syndicId: user.id, status: SubscriptionStatus.TRIAL },
    });
    for (let i = 0; i < 3; i++) {
      await makeCondominium({ primarySyndicId: user.id });
    }
    await expect(
      trialCondoLimitGuard(asReq({ id: user.id, role: user.role }), fakeReply()),
    ).rejects.toMatchObject({ code: "TRIAL_CONDO_LIMIT", statusCode: 402 });
  });
});
