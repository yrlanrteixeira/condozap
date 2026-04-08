import type { PaymentProvider } from "./payment-provider.interface";
import { AbacatePayClient, AbacatePayProvider } from "./abacatepay";

let cachedProvider: PaymentProvider | null = null;

/**
 * Returns the configured payment provider instance.
 * Cached for the lifetime of the process — safe because providers are stateless.
 */
export function getPaymentProvider(): PaymentProvider {
  if (cachedProvider) return cachedProvider;

  const providerId = process.env.PAYMENT_PROVIDER ?? "abacatepay";

  switch (providerId) {
    case "abacatepay": {
      const apiKey = process.env.ABACATEPAY_API_KEY;
      if (!apiKey) {
        throw new Error(
          "ABACATEPAY_API_KEY is not set. Billing is disabled.",
        );
      }
      cachedProvider = new AbacatePayProvider(new AbacatePayClient(apiKey));
      return cachedProvider;
    }
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER: ${providerId}`);
  }
}

/** Reset the cached provider — only for tests. */
export function _resetPaymentProviderCache(): void {
  cachedProvider = null;
}
