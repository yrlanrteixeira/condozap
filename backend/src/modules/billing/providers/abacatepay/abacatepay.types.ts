/**
 * Raw response shapes from AbacatePay API v1.
 * These are used ONLY inside the abacatepay provider and mappers.
 * Never expose these types outside this folder.
 */

export interface AbacateResponse<T> {
  data: T | null;
  error: string | null;
}

export interface AbacateCustomer {
  id: string;
  metadata: {
    name: string;
    cellphone: string;
    email: string;
    taxId: string;
  };
}

export interface AbacatePixQrCode {
  id: string;
  amount: number;
  status: "PENDING" | "PAID" | "EXPIRED";
  devMode: boolean;
  brCode: string;
  brCodeBase64: string;
  platformFee: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  metadata?: Record<string, unknown>;
}

export interface AbacateBillingProduct {
  id?: string;
  externalId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface AbacateBilling {
  id: string;
  url: string;
  amount: number;
  status: string;
  devMode: boolean;
  methods: string[];
  products: AbacateBillingProduct[];
  frequency: "ONE_TIME" | "MULTIPLE_PAYMENTS";
  nextBilling: string | null;
  customer: AbacateCustomer | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Webhook event payload from AbacatePay.
 * Shape is not fully documented; this is defensive.
 */
export interface AbacateWebhookPayload {
  event?: string;
  data?: {
    id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
