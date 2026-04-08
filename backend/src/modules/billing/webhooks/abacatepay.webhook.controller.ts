import { PaymentBillStatus, SubscriptionStatus } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../shared/db/prisma";
import { getPaymentProvider } from "../providers";

const CYCLE_DAYS = 30;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Public webhook receiver for AbacatePay.
 *
 * Security model (AbacatePay does not document signature validation):
 * 1. Path secret (`:secret` param) matched against BILLING_WEBHOOK_SECRET
 * 2. Every payload is logged in `webhook_events` before processing (audit trail)
 * 3. Bills are matched by `externalId`. Unknown ids become no-op responses
 * 4. Idempotency: PAID bills never transition again on replay
 * 5. Always returns HTTP 200 to prevent AbacatePay retries (audit trail
 *    allows manual reprocessing if needed)
 */
export async function handleAbacatePayWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const expected = process.env.BILLING_WEBHOOK_SECRET;
  const { secret } = request.params as { secret: string };
  const rawBody = request.body as Record<string, unknown> | null;

  // Always log the event first so we can reconstruct later even if something crashes.
  let eventLogId: string | null = null;
  try {
    const logged = await prisma.webhookEvent.create({
      data: {
        providerId: "abacatepay",
        eventType: (rawBody as { event?: string })?.event ?? "unknown",
        payload: (rawBody ?? {}) as import("@prisma/client").Prisma.InputJsonValue,
      },
    });
    eventLogId = logged.id;
  } catch (err) {
    request.log.error(
      { err, where: "abacatepay.webhook.log" },
      "failed to persist webhook audit entry",
    );
    // Still return 200 — we cannot let persistence errors block the provider.
    return reply.code(200).send({ ok: true });
  }

  const markProcessed = async (error: string | null, externalId?: string) => {
    if (!eventLogId) return;
    await prisma.webhookEvent
      .update({
        where: { id: eventLogId },
        data: {
          processedAt: new Date(),
          error,
          externalId: externalId ?? null,
        },
      })
      .catch(() => undefined);
  };

  // Path-secret check — if wrong, we still return 200 (no info leak)
  if (!expected || secret !== expected) {
    await markProcessed("invalid_secret");
    return reply.code(200).send({ ok: true });
  }

  if (!rawBody) {
    await markProcessed("empty_body");
    return reply.code(200).send({ ok: true });
  }

  const provider = getPaymentProvider();
  const parsed = provider.parseWebhook(rawBody);
  if (!parsed) {
    await markProcessed("unknown_event_type");
    return reply.code(200).send({ ok: true });
  }

  const bill = await prisma.paymentBill.findFirst({
    where: { providerId: "abacatepay", externalId: parsed.externalBillId },
  });

  if (!bill) {
    await markProcessed("bill_not_found", parsed.externalBillId);
    return reply.code(200).send({ ok: true });
  }

  // Idempotency
  if (bill.status === PaymentBillStatus.PAID && parsed.eventType === "bill.paid") {
    await markProcessed(null, parsed.externalBillId);
    return reply.code(200).send({ ok: true });
  }

  try {
    if (parsed.eventType === "bill.paid") {
      await prisma.$transaction(async (tx) => {
        await tx.paymentBill.update({
          where: { id: bill.id },
          data: {
            status: PaymentBillStatus.PAID,
            paidAt: parsed.paidAt ?? new Date(),
          },
        });

        const subUpdateData: import("@prisma/client").Prisma.SubscriptionUpdateInput = {
          status: SubscriptionStatus.ACTIVE,
          setupPaid: true,
          currentPeriodStart: new Date(),
          currentPeriodEnd: addDays(new Date(), CYCLE_DAYS),
          cancelledAt: null,
        };
        if (bill.planId) {
          subUpdateData.currentPlan = { connect: { id: bill.planId } };
        }

        await tx.subscription.update({
          where: { id: bill.subscriptionId },
          data: subUpdateData,
        });
      });

      request.log.info(
        { billId: bill.id, subscriptionId: bill.subscriptionId, event: parsed.rawEvent },
        "billing: subscription activated via webhook",
      );
    } else if (parsed.eventType === "bill.expired") {
      await prisma.paymentBill.update({
        where: { id: bill.id },
        data: { status: PaymentBillStatus.EXPIRED },
      });
    } else if (parsed.eventType === "bill.failed") {
      await prisma.paymentBill.update({
        where: { id: bill.id },
        data: { status: PaymentBillStatus.FAILED },
      });
    }

    await markProcessed(null, parsed.externalBillId);
  } catch (err) {
    request.log.error(
      { err, billId: bill.id, event: parsed.rawEvent },
      "abacatepay.webhook: processing failed",
    );
    await markProcessed((err as Error).message, parsed.externalBillId);
  }

  return reply.code(200).send({ ok: true });
}
