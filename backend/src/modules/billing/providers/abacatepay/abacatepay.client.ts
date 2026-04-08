import { PaymentProviderError } from "../payment-provider.interface";
import type { AbacateResponse } from "./abacatepay.types";

/**
 * Low-level HTTP client for AbacatePay API v1.
 *
 * This module is server-only: never import it from any code that runs in the
 * browser bundle. The API key is read from the environment and sent as a
 * Bearer token.
 *
 * The condozap backend is plain Node/Fastify and the frontend lives in a
 * separate Vite project, so cross-bundle imports are physically prevented
 * by the project boundary. The runtime check below is a belt-and-suspenders
 * defense in case this file is ever transitively imported into a build that
 * targets the browser.
 */
declare const globalThis: { window?: unknown };
if (typeof globalThis !== "undefined" && (globalThis as { window?: unknown }).window !== undefined) {
  throw new Error(
    "abacatepay.client must not be loaded in a browser environment",
  );
}

const BASE_URL = "https://api.abacatepay.com";

export class AbacatePayClient {
  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error("AbacatePayClient: apiKey is required");
    }
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });
    } catch (err) {
      throw new PaymentProviderError(
        `AbacatePay request failed: ${(err as Error).message}`,
        "abacatepay",
        undefined,
        err,
      );
    }

    let json: AbacateResponse<T>;
    try {
      json = (await response.json()) as AbacateResponse<T>;
    } catch (err) {
      throw new PaymentProviderError(
        `AbacatePay returned non-JSON body (status ${response.status})`,
        "abacatepay",
        response.status,
        err,
      );
    }

    if (!response.ok || json.error) {
      throw new PaymentProviderError(
        json.error ?? `AbacatePay HTTP ${response.status}`,
        "abacatepay",
        response.status,
        json,
      );
    }

    if (json.data === null) {
      throw new PaymentProviderError(
        "AbacatePay returned empty data",
        "abacatepay",
        response.status,
      );
    }

    return json.data;
  }
}
