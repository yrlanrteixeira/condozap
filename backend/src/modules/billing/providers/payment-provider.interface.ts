/**
 * Provider-agnostic contract for payment providers.
 *
 * All types are internal — they MUST NOT leak provider-specific field names
 * (e.g. AbacatePay's `brCode`) to consumers of this interface. Providers
 * map their raw responses into these shapes via their own mappers.
 */

export interface PaymentProvider {
  readonly id: string;

  createCustomer(input: CreateCustomerInput): Promise<CustomerResult>;
  createPixBill(input: CreatePixBillInput): Promise<PixBillResult>;
  createCardBill(input: CreateCardBillInput): Promise<CardBillResult>;

  /**
   * Parse a raw webhook payload into a normalized event.
   * Returns null if the event type is unknown or the payload is malformed.
   */
  parseWebhook(raw: unknown): ParsedWebhookEvent | null;
}

// -----------------------------------------------------------------------------
// Customer
// -----------------------------------------------------------------------------

export interface CreateCustomerInput {
  name: string;
  email: string;
  cellphone: string;
  /** CPF (without formatting) — required because the customer is always a PF */
  taxId: string;
}

export interface CustomerResult {
  /** Provider-specific customer id (e.g. AbacatePay "cust_xxx") */
  externalId: string;
  email: string;
  name: string;
}

// -----------------------------------------------------------------------------
// PIX bill
// -----------------------------------------------------------------------------

export interface CreatePixBillInput {
  amountCents: number;
  description: string;
  expiresInSeconds: number;
  customerExternalId?: string;
  metadata: PaymentBillMetadata;
}

export interface PixBillResult {
  externalId: string;
  /** PIX copy-paste code (BR Code) */
  brCode: string;
  /** PIX QR code as base64 PNG */
  brCodeBase64: string;
  expiresAt: Date;
}

// -----------------------------------------------------------------------------
// Card bill
// -----------------------------------------------------------------------------

export interface CreateCardBillInput {
  amountCents: number;
  description: string;
  productName: string;
  customerExternalId?: string;
  returnUrl: string;
  completionUrl: string;
  metadata: PaymentBillMetadata;
}

export interface CardBillResult {
  externalId: string;
  /** URL of the provider-hosted checkout page */
  checkoutUrl: string;
}

// -----------------------------------------------------------------------------
// Webhook events
// -----------------------------------------------------------------------------

export type WebhookEventType = "bill.paid" | "bill.expired" | "bill.failed";

export interface ParsedWebhookEvent {
  eventType: WebhookEventType;
  /** Provider's bill id (matches PaymentBill.externalId in our DB) */
  externalBillId: string;
  paidAt?: Date;
  /** Original event name from the provider — kept for logging */
  rawEvent: string;
}

// -----------------------------------------------------------------------------
// Shared metadata
// -----------------------------------------------------------------------------

/**
 * Metadata that travels with every bill to the provider so we can
 * correlate webhooks back to our internal records.
 */
export interface PaymentBillMetadata {
  billId: string;
  subscriptionId: string;
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
