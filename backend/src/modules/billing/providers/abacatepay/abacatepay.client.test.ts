import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentProviderError } from "../payment-provider.interface";

/**
 * IMPORTANT: The global test setup (test/mocks/abacatepay-client.ts) replaces
 * the AbacatePayClient class with a shim. These unit tests need the REAL
 * implementation so we `vi.unmock` before importing.
 */

vi.unmock("./abacatepay.client");

const loadClient = async () => {
  const mod = await import("./abacatepay.client");
  return mod.AbacatePayClient;
};

describe("AbacatePayClient (real)", () => {
  let originalFetch: typeof globalThis.fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("throws when apiKey is missing", async () => {
    const AbacatePayClient = await loadClient();
    expect(() => new AbacatePayClient("")).toThrow(/apiKey is required/);
  });

  it("sends Authorization header and returns parsed data", async () => {
    const AbacatePayClient = await loadClient();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "x" }, error: null }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new AbacatePayClient("k1");
    const result = await client.request<{ id: string }>("/v1/ping", {
      method: "POST",
      body: "{}",
    });
    expect(result).toEqual({ id: "x" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.abacatepay.com/v1/ping",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer k1",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("attaches a 10s AbortSignal timeout to the fetch call", async () => {
    const AbacatePayClient = await loadClient();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { ok: true }, error: null }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new AbacatePayClient("k1");
    await client.request("/v1/ping");

    const call = fetchMock.mock.calls[0];
    const init = call[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("respects a caller-supplied AbortSignal over the default timeout", async () => {
    const AbacatePayClient = await loadClient();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { ok: true }, error: null }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const ac = new AbortController();
    const client = new AbacatePayClient("k1");
    await client.request("/v1/ping", { signal: ac.signal });

    const call = fetchMock.mock.calls[0];
    const init = call[1] as RequestInit;
    expect(init.signal).toBe(ac.signal);
  });

  it("wraps network errors into PaymentProviderError", async () => {
    const AbacatePayClient = await loadClient();
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;
    const client = new AbacatePayClient("k");
    await expect(client.request("/v1/any")).rejects.toMatchObject({
      name: "PaymentProviderError",
      providerId: "abacatepay",
    });
  });

  it("wraps non-JSON body into PaymentProviderError with statusCode", async () => {
    const AbacatePayClient = await loadClient();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("bad json");
      },
    }) as unknown as typeof fetch;
    const client = new AbacatePayClient("k");
    await expect(client.request("/v1/x")).rejects.toMatchObject({
      name: "PaymentProviderError",
      statusCode: 500,
    });
  });

  it("throws when response is not ok (HTTP error)", async () => {
    const AbacatePayClient = await loadClient();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ data: null, error: "forbidden" }),
    }) as unknown as typeof fetch;
    const client = new AbacatePayClient("k");
    await expect(client.request("/v1/x")).rejects.toMatchObject({
      name: "PaymentProviderError",
      statusCode: 403,
      message: "forbidden",
    });
  });

  it("throws when response is ok but error field is set", async () => {
    const AbacatePayClient = await loadClient();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: null, error: "nope" }),
    }) as unknown as typeof fetch;
    const client = new AbacatePayClient("k");
    await expect(client.request("/v1/x")).rejects.toThrow(/nope/);
  });

  it("throws when both response ok and error null but data is null", async () => {
    const AbacatePayClient = await loadClient();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: null, error: null }),
    }) as unknown as typeof fetch;
    const client = new AbacatePayClient("k");
    await expect(client.request("/v1/x")).rejects.toMatchObject({
      name: "PaymentProviderError",
      message: expect.stringContaining("empty data"),
    });
  });
});

describe("PaymentProviderError", () => {
  it("carries providerId, statusCode and cause", () => {
    const err = new PaymentProviderError("boom", "abacatepay", 500, { detail: 1 });
    expect(err.name).toBe("PaymentProviderError");
    expect(err.providerId).toBe("abacatepay");
    expect(err.statusCode).toBe(500);
    expect(err.cause).toEqual({ detail: 1 });
  });
});
