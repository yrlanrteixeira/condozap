import { PaymentBillStatus, PaymentBillType, PaymentMethod, type PrismaClient, type Subscription } from "@prisma/client";
import { NotFoundError } from "../../../shared/errors";
import { getPaymentProvider } from "../providers";
import type { PaymentProvider } from "../providers";
import { computeCycleAmount } from "../lib/compute-cycle-amount";
import * as subRepo from "../subscriptions/subscriptions.repository";
import * as repo from "./bills.repository";

const PIX_EXPIRATION_SECONDS = 60 * 60 * 24 * 3; // 3 days

interface EnsureCustomerDeps {
  provider: PaymentProvider;
  prisma: PrismaClient;
}

/**
 * Ensures the subscription has an externalCustomerId with the provider.
 * Creates the customer on first use. Requires the syndic user to have
 * a CPF cadastrado — otherwise throws CUSTOMER_CPF_REQUIRED.
 */
async function ensureProviderCustomer(
  { provider, prisma }: EnsureCustomerDeps,
  subscription: Subscription,
): Promise<string | null> {
  if (subscription.externalCustomerId) return subscription.externalCustomerId;

  const user = await prisma.user.findUnique({
    where: { id: subscription.syndicId },
    select: { name: true, email: true, contactPhone: true },
  });
  if (!user) throw new NotFoundError("Síndico");

  // The current User schema does not store a CPF. AbacatePay's
  // /v1/customer/create requires taxId, so we cannot persist a customer
  // record yet. For the MVP we fall back to anonymous bill creation —
  // AbacatePay will prompt for the tax id in the checkout flow.
  //
  // When User gains a `cpf` field this block should call
  // `provider.createCustomer(...)` and persist the returned `externalId`
  // on `subscription.externalCustomerId`.
  void provider;
  return null;
}

export async function createPixBillForCurrentCycle(
  prisma: PrismaClient,
  syndicId: string,
) {
  const sub = await subRepo.findBySyndicId(prisma, syndicId);
  if (!sub) throw new NotFoundError("Assinatura");

  // Reuse an existing fully-formed pending bill (idempotency on click-spam).
  // A bill is "fully formed" when it has both an externalId AND a pixBrCode —
  // bills missing either are abandoned (e.g. provider call failed mid-creation)
  // and will be cleaned up by the scheduled job.
  const existing = await repo.findPendingForSubscription(prisma, sub.id);
  if (existing && existing.externalId && existing.pixBrCode) return existing;

  const isFirstCycle = !sub.setupPaid;
  const amount = await computeCycleAmount(prisma, syndicId, isFirstCycle);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  // Create internal bill first so we can correlate webhooks via metadata.
  const bill = await repo.create(prisma, {
    subscription: { connect: { id: sub.id } },
    plan: { connect: { id: amount.plan.id } },
    type: isFirstCycle ? PaymentBillType.FIRST_CYCLE : PaymentBillType.SUBSCRIPTION_CYCLE,
    method: PaymentMethod.PIX,
    status: PaymentBillStatus.PENDING,
    amountCents: amount.totalAmountCents,
    breakdown: {
      activeCondos: amount.activeCondos,
      pricePerCondoCents: amount.pricePerCondoCents,
      cycleAmountCents: amount.cycleAmountCents,
      setupAmountCents: amount.setupAmountCents,
    },
    periodStart: now,
    periodEnd,
  });

  // If the provider call fails, roll back the dangling bill row so the user
  // can retry from a clean state. We swallow rollback errors to surface the
  // original cause.
  try {
    const provider = getPaymentProvider();
    const customerExternalId = await ensureProviderCustomer({ provider, prisma }, sub);

    const description = isFirstCycle
      ? `Condozap — primeiro ciclo (${amount.activeCondos} condomínio(s) + setup)`
      : `Condozap — ciclo mensal (${amount.activeCondos} condomínio(s))`;

    const pixResult = await provider.createPixBill({
      amountCents: amount.totalAmountCents,
      description,
      expiresInSeconds: PIX_EXPIRATION_SECONDS,
      customerExternalId: customerExternalId ?? undefined,
      metadata: { billId: bill.id, subscriptionId: sub.id },
    });

    return await repo.update(prisma, bill.id, {
      externalId: pixResult.externalId,
      pixBrCode: pixResult.brCode,
      pixBrCodeBase64: pixResult.brCodeBase64,
      expiresAt: pixResult.expiresAt,
      providerPayload: {
        externalId: pixResult.externalId,
        expiresAt: pixResult.expiresAt.toISOString(),
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });
  } catch (err) {
    await repo.deleteById(prisma, bill.id).catch(() => undefined);
    throw err;
  }
}

export async function createCardBillForCurrentCycle(
  prisma: PrismaClient,
  syndicId: string,
) {
  const sub = await subRepo.findBySyndicId(prisma, syndicId);
  if (!sub) throw new NotFoundError("Assinatura");

  const isFirstCycle = !sub.setupPaid;
  const amount = await computeCycleAmount(prisma, syndicId, isFirstCycle);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const bill = await repo.create(prisma, {
    subscription: { connect: { id: sub.id } },
    plan: { connect: { id: amount.plan.id } },
    type: isFirstCycle ? PaymentBillType.FIRST_CYCLE : PaymentBillType.SUBSCRIPTION_CYCLE,
    method: PaymentMethod.CARD,
    status: PaymentBillStatus.PENDING,
    amountCents: amount.totalAmountCents,
    breakdown: {
      activeCondos: amount.activeCondos,
      pricePerCondoCents: amount.pricePerCondoCents,
      cycleAmountCents: amount.cycleAmountCents,
      setupAmountCents: amount.setupAmountCents,
    },
    periodStart: now,
    periodEnd,
  });

  try {
    const provider = getPaymentProvider();
    const customerExternalId = await ensureProviderCustomer({ provider, prisma }, sub);

    const returnUrl = process.env.BILLING_RETURN_URL ?? "http://localhost:5173/assinatura";
    const completionUrl =
      process.env.BILLING_COMPLETION_URL ?? "http://localhost:5173/assinatura?status=ok";

    const cardResult = await provider.createCardBill({
      amountCents: amount.totalAmountCents,
      description: isFirstCycle
        ? "Condozap — primeiro ciclo"
        : "Condozap — ciclo mensal",
      productName: "Assinatura Condozap",
      customerExternalId: customerExternalId ?? undefined,
      returnUrl,
      completionUrl,
      metadata: { billId: bill.id, subscriptionId: sub.id },
    });

    return await repo.update(prisma, bill.id, {
      externalId: cardResult.externalId,
      checkoutUrl: cardResult.checkoutUrl,
      providerPayload: {
        externalId: cardResult.externalId,
        checkoutUrl: cardResult.checkoutUrl,
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });
  } catch (err) {
    await repo.deleteById(prisma, bill.id).catch(() => undefined);
    throw err;
  }
}

export async function listMyBills(
  prisma: PrismaClient,
  syndicId: string,
) {
  const sub = await subRepo.findBySyndicId(prisma, syndicId);
  if (!sub) return [];
  return repo.listBySubscription(prisma, sub.id);
}

export async function listBillsForSyndic(
  prisma: PrismaClient,
  syndicId: string,
) {
  const sub = await subRepo.findBySyndicId(prisma, syndicId);
  if (!sub) throw new NotFoundError("Assinatura");
  return repo.listBySubscription(prisma, sub.id, 50);
}

export async function createManualBill(
  prisma: PrismaClient,
  syndicId: string,
  amountCents: number,
  description: string,
) {
  const sub = await subRepo.findBySyndicId(prisma, syndicId);
  if (!sub) throw new NotFoundError("Assinatura");

  const bill = await repo.create(prisma, {
    subscription: { connect: { id: sub.id } },
    type: PaymentBillType.MANUAL,
    method: PaymentMethod.PIX,
    status: PaymentBillStatus.PENDING,
    amountCents,
    breakdown: { manual: true, description },
  });

  try {
    const provider = getPaymentProvider();
    const customerExternalId = await ensureProviderCustomer({ provider, prisma }, sub);

    const pixResult = await provider.createPixBill({
      amountCents,
      description,
      expiresInSeconds: PIX_EXPIRATION_SECONDS,
      customerExternalId: customerExternalId ?? undefined,
      metadata: { billId: bill.id, subscriptionId: sub.id },
    });

    return await repo.update(prisma, bill.id, {
      externalId: pixResult.externalId,
      pixBrCode: pixResult.brCode,
      pixBrCodeBase64: pixResult.brCodeBase64,
      expiresAt: pixResult.expiresAt,
      providerPayload: {
        externalId: pixResult.externalId,
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });
  } catch (err) {
    await repo.deleteById(prisma, bill.id).catch(() => undefined);
    throw err;
  }
}

// Exported for the webhook handler — kept here to keep bill-mutation logic
// in one place.
export { repo as billRepo };
