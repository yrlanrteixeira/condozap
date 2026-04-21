import { faker } from "@faker-js/faker";
import {
  PaymentBillStatus,
  PaymentBillType,
  PaymentMethod,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";
import { getTestPrisma } from "../helpers/db";
import { makeUser } from "./user.factory";

export type MakeBillOverrides = Partial<{
  subscriptionId: string;
  planId: string | null;
  type: PaymentBillType;
  method: PaymentMethod | null;
  status: PaymentBillStatus;
  amountCents: number;
  breakdown: Record<string, unknown>;
  externalId: string | null;
  providerId: string;
  expiresAt: Date | null;
  paidAt: Date | null;
}>;

/**
 * Creates a PaymentBill. If no subscriptionId is provided, creates a Syndic
 * user + a Subscription inline (no Plan needed — planId is optional).
 */
export const makeBill = async (overrides: MakeBillOverrides = {}) => {
  const p = getTestPrisma();

  let subscriptionId = overrides.subscriptionId;
  if (!subscriptionId) {
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const sub = await p.subscription.create({
      data: {
        syndicId: syndic.id,
        status: SubscriptionStatus.TRIAL,
      },
    });
    subscriptionId = sub.id;
  }

  return p.paymentBill.create({
    data: {
      subscriptionId,
      planId: overrides.planId ?? null,
      type: overrides.type ?? PaymentBillType.SUBSCRIPTION_CYCLE,
      method: overrides.method ?? PaymentMethod.PIX,
      status: overrides.status ?? PaymentBillStatus.PENDING,
      amountCents:
        overrides.amountCents ?? faker.number.int({ min: 1000, max: 100000 }),
      breakdown: overrides.breakdown ?? { base: 10000 },
      externalId: overrides.externalId ?? null,
      providerId: overrides.providerId ?? "abacatepay",
      expiresAt: overrides.expiresAt ?? null,
      paidAt: overrides.paidAt ?? null,
    },
  });
};
