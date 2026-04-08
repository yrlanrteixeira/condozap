import type {
  CardBillResult,
  CreateCardBillInput,
  CreateCustomerInput,
  CreatePixBillInput,
  CustomerResult,
  ParsedWebhookEvent,
  PaymentProvider,
  PixBillResult,
} from "../payment-provider.interface";
import { AbacatePayClient } from "./abacatepay.client";
import {
  mapCardBill,
  mapCustomer,
  mapPixBill,
  mapWebhookEvent,
} from "./abacatepay.mappers";
import type {
  AbacateBilling,
  AbacateCustomer,
  AbacatePixQrCode,
} from "./abacatepay.types";

export class AbacatePayProvider implements PaymentProvider {
  readonly id = "abacatepay";

  constructor(private readonly client: AbacatePayClient) {}

  async createCustomer(input: CreateCustomerInput): Promise<CustomerResult> {
    const raw = await this.client.request<AbacateCustomer>("/v1/customer/create", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        cellphone: input.cellphone,
        taxId: input.taxId,
      }),
    });
    return mapCustomer(raw);
  }

  async createPixBill(input: CreatePixBillInput): Promise<PixBillResult> {
    const raw = await this.client.request<AbacatePixQrCode>(
      "/v1/pixQrCode/create",
      {
        method: "POST",
        body: JSON.stringify({
          amount: input.amountCents,
          expiresIn: input.expiresInSeconds,
          description: input.description,
          ...(input.customerExternalId ? { customerId: input.customerExternalId } : {}),
          metadata: input.metadata,
        }),
      },
    );
    return mapPixBill(raw);
  }

  async createCardBill(input: CreateCardBillInput): Promise<CardBillResult> {
    const raw = await this.client.request<AbacateBilling>("/v1/billing/create", {
      method: "POST",
      body: JSON.stringify({
        methods: ["CARD"],
        frequency: "ONE_TIME",
        products: [
          {
            name: input.productName,
            quantity: 1,
            price: input.amountCents,
            externalId: input.metadata.billId,
          },
        ],
        ...(input.customerExternalId ? { customerId: input.customerExternalId } : {}),
        returnUrl: input.returnUrl,
        completionUrl: input.completionUrl,
      }),
    });
    return mapCardBill(raw);
  }

  parseWebhook(raw: unknown): ParsedWebhookEvent | null {
    return mapWebhookEvent(raw);
  }
}
