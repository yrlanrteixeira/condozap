import { beforeEach, describe, expect, it } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import { getTestApp, setupIntegrationSuite } from "../../../../test/helpers/build-test-app";
import { authedInject } from "../../../../test/helpers/auth";
import { getTestPrisma } from "../../../../test/helpers/db";
import { makeCondominium, makeUser } from "../../../../test/factories";

/**
 * The global billing hook is exercised here through a real write endpoint
 * (POST /api/canned-responses) so we cover the whole pipeline:
 *   authenticate -> billing guard -> route guard.
 *
 * The hook throws a 402 PaymentRequiredError when the owning syndic is
 * soft_locked, hard_locked, cancelled, expired or has no subscription at all.
 */

setupIntegrationSuite();

const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400_000);

async function makeSyndic(opts: {
  status?: SubscriptionStatus;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  withSub?: boolean;
} = {}) {
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  if (opts.withSub !== false) {
    await getTestPrisma().subscription.create({
      data: {
        syndicId: syndic.id,
        status: opts.status ?? SubscriptionStatus.ACTIVE,
        trialEndsAt: opts.trialEndsAt ?? null,
        currentPeriodEnd: opts.currentPeriodEnd ?? addDays(new Date(), 30),
      },
    });
  }
  return syndic;
}

const post = (user: Awaited<ReturnType<typeof makeUser>>) =>
  getTestApp().then((app) =>
    authedInject(app, user, {
      method: "POST",
      url: "/api/canned-responses",
      payload: { title: "t", content: "c" },
    }),
  );

describe("globalSubscriptionHook", () => {
  beforeEach(async () => {
    // Each test needs a clean slate — setupIntegrationSuite truncates between tests
  });

  it("allows a write when syndic's subscription is ACTIVE & in period", async () => {
    const syndic = await makeSyndic({ status: SubscriptionStatus.ACTIVE });
    const res = await post(syndic);
    // The hook passed; route-level guards may still 400 on body, but NOT 402.
    expect(res.statusCode).not.toBe(402);
  });

  it("allows a write during TRIAL", async () => {
    const syndic = await makeSyndic({
      status: SubscriptionStatus.TRIAL,
      trialEndsAt: addDays(new Date(), 5),
    });
    const res = await post(syndic);
    expect(res.statusCode).not.toBe(402);
  });

  it("blocks with 402 NO_SUBSCRIPTION when syndic has no subscription row", async () => {
    const syndic = await makeSyndic({ withSub: false });
    const res = await post(syndic);
    expect(res.statusCode).toBe(402);
    expect(res.json().code).toBe("NO_SUBSCRIPTION");
  });

  it("blocks with 402 SOFT_LOCKED when subscription is past grace", async () => {
    const syndic = await makeSyndic({
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: addDays(new Date(), -5),
    });
    const res = await post(syndic);
    expect(res.statusCode).toBe(402);
    expect(res.json().code).toBe("SOFT_LOCKED");
  });

  it("blocks with 402 HARD_LOCKED after 15+ days past expiry", async () => {
    const syndic = await makeSyndic({
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: addDays(new Date(), -20),
    });
    const res = await post(syndic);
    expect(res.statusCode).toBe(402);
    expect(res.json().code).toBe("HARD_LOCKED");
  });

  it("blocks with 402 CANCELLED when status is CANCELLED", async () => {
    const syndic = await makeSyndic({ status: SubscriptionStatus.CANCELLED });
    const res = await post(syndic);
    expect(res.statusCode).toBe(402);
    expect(res.json().code).toBe("CANCELLED");
  });

  it("blocks with 402 TRIAL_EXPIRED when status is EXPIRED", async () => {
    const syndic = await makeSyndic({ status: SubscriptionStatus.EXPIRED });
    const res = await post(syndic);
    expect(res.statusCode).toBe(402);
    expect(res.json().code).toBe("TRIAL_EXPIRED");
  });

  it("is a no-op for SUPER_ADMIN (bypasses billing entirely)", async () => {
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await post(sa);
    // Billing hook lets it through; the route-level role guard then rejects
    // since SUPER_ADMIN is not in the canned-response writer set.
    expect(res.statusCode).toBe(403);
  });

  it("does not run on GET (read) operations", async () => {
    const syndic = await makeSyndic({ withSub: false });
    const app = await getTestApp();
    const res = await authedInject(app, syndic, {
      method: "GET",
      url: "/api/canned-responses",
    });
    // No 402 — read is not gated
    expect(res.statusCode).not.toBe(402);
  });

  it("resolves the billed syndic for non-syndic users via their condominium", async () => {
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await getTestPrisma().subscription.create({
      data: {
        syndicId: syndic.id,
        status: SubscriptionStatus.CANCELLED,
      },
    });

    const member = await makeUser({ role: UserRole.ADMIN });
    await getTestPrisma().userCondominium.create({
      data: { userId: member.id, condominiumId: condo.id, role: UserRole.ADMIN },
    });

    const res = await post(member);
    expect(res.statusCode).toBe(402);
    expect(res.json().code).toBe("CANCELLED");
  });

  it("skips POST /api/condominiums (gated by trialCondoLimitGuard instead)", async () => {
    // POST /api/condominiums will hit the dedicated condo limit guard rather
    // than the global billing hook — make sure the global hook does not
    // double-enforce by throwing 402 there. We just verify the response is
    // NOT the global NO_SUBSCRIPTION code.
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await (await getTestApp()).inject({
      method: "POST",
      url: "/api/condominiums",
      headers: { authorization: `Bearer ${(await getTestApp()).jwt.sign({
        id: syndic.id,
        email: syndic.email,
        role: syndic.role,
        status: "ACTIVE",
        name: syndic.name,
        permissionScope: "CONDOMINIUM",
        mustChangePassword: false,
      })}` },
      payload: {},
    });
    expect(res.statusCode).not.toBe(402);
  });
});
