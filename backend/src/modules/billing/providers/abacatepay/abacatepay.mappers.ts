import type {
  CardBillResult,
  CustomerResult,
  ParsedWebhookEvent,
  PixBillResult,
} from "../payment-provider.interface";
import type {
  AbacateBilling,
  AbacateCustomer,
  AbacatePixQrCode,
  AbacateWebhookPayload,
} from "./abacatepay.types";

export function mapCustomer(raw: AbacateCustomer): CustomerResult {
  return {
    externalId: raw.id,
    name: raw.metadata.name,
    email: raw.metadata.email,
  };
}

export function mapPixBill(raw: AbacatePixQrCode): PixBillResult {
  return {
    externalId: raw.id,
    brCode: raw.brCode,
    brCodeBase64: raw.brCodeBase64,
    expiresAt: new Date(raw.expiresAt),
  };
}

export function mapCardBill(raw: AbacateBilling): CardBillResult {
  return {
    externalId: raw.id,
    checkoutUrl: raw.url,
  };
}

/**
 * Normalize an AbacatePay webhook payload into our internal event shape.
 * Returns null if the event type is not one we care about or the shape is invalid.
 */
export function mapWebhookEvent(raw: unknown): ParsedWebhookEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as AbacateWebhookPayload;

  const event = payload.event;
  const externalBillId = payload.data?.id;

  if (typeof event !== "string" || typeof externalBillId !== "string") {
    return null;
  }

  if (event === "billing.paid" || event === "pix.paid") {
    return {
      eventType: "bill.paid",
      externalBillId,
      paidAt: new Date(),
      rawEvent: event,
    };
  }

  if (event === "pix.expired" || event === "billing.expired") {
    return {
      eventType: "bill.expired",
      externalBillId,
      rawEvent: event,
    };
  }

  if (event === "billing.failed" || event === "pix.failed") {
    return {
      eventType: "bill.failed",
      externalBillId,
      rawEvent: event,
    };
  }

  return null;
}
