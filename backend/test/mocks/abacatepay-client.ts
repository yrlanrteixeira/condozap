import { vi } from "vitest";

/**
 * Global mock for the AbacatePay low-level HTTP client.
 *
 * Real module: backend/src/modules/billing/providers/abacatepay/abacatepay.client.ts
 * Real export: `AbacatePayClient` class with a single `request<T>(path, init)` method.
 *
 * We replace the class with a constructible shim whose `request` is a shared
 * vi.fn() so tests can override/assert across all instances:
 *   mockAbacatePayRequest.mockResolvedValueOnce({ id: "bill_1", ... })
 *   expect(mockAbacatePayRequest).toHaveBeenCalledWith("/v1/billing/create", ...)
 */
export const mockAbacatePayRequest = vi.fn().mockResolvedValue({});

export class MockAbacatePayClient {
  constructor(_apiKey?: string) {
    // Intentionally no-op: the real client requires apiKey but tests don't.
  }
  request = mockAbacatePayRequest;
}

vi.mock(
  "../../src/modules/billing/providers/abacatepay/abacatepay.client",
  () => ({
    AbacatePayClient: MockAbacatePayClient,
  }),
);
