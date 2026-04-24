import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetPaymentProviderCache, getPaymentProvider } from "./provider.factory";

describe("getPaymentProvider", () => {
  const prevProvider = process.env.PAYMENT_PROVIDER;
  const prevKey = process.env.ABACATEPAY_API_KEY;

  beforeEach(() => {
    _resetPaymentProviderCache();
  });

  afterEach(() => {
    process.env.PAYMENT_PROVIDER = prevProvider;
    process.env.ABACATEPAY_API_KEY = prevKey;
    _resetPaymentProviderCache();
  });

  it("returns an AbacatePay provider by default and caches the instance", () => {
    process.env.PAYMENT_PROVIDER = "abacatepay";
    process.env.ABACATEPAY_API_KEY = "k1";
    const a = getPaymentProvider();
    const b = getPaymentProvider();
    expect(a).toBe(b);
    expect(a.id).toBe("abacatepay");
  });

  it("throws when ABACATEPAY_API_KEY is missing", () => {
    process.env.PAYMENT_PROVIDER = "abacatepay";
    delete process.env.ABACATEPAY_API_KEY;
    expect(() => getPaymentProvider()).toThrow(/ABACATEPAY_API_KEY/);
  });

  it("throws for unknown providers", () => {
    process.env.PAYMENT_PROVIDER = "stripe";
    expect(() => getPaymentProvider()).toThrow(/Unknown PAYMENT_PROVIDER/);
  });
});
