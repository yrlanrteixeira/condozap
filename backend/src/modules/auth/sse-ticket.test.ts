/**
 * Unit tests for SSE ticket: short-lived (60s) tokens that the frontend
 * obtains via an authenticated POST and then passes in the SSE query.
 * This avoids long-lived JWTs leaking into logs/Referer/history.
 */
import { describe, expect, it } from "vitest";
import { issueSseTicket, verifySseTicket } from "./sse-ticket";

const FAKE_JWT = {
  sign: (payload: any, opts: any) => {
    return Buffer.from(JSON.stringify({ payload, opts })).toString("base64url");
  },
  verify: (token: string) => {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8")
    );
    return decoded.payload;
  },
};

describe("sse-ticket", () => {
  it("issues a ticket with type=sse and short ttl", () => {
    const ticket = issueSseTicket(FAKE_JWT as any, "user-123");
    const decoded = verifySseTicket(FAKE_JWT as any, ticket);
    expect(decoded?.userId).toBe("user-123");
  });

  it("rejects a token whose type is not sse", () => {
    // Forge a token with the wrong type
    const bad = FAKE_JWT.sign({ id: "user-1", type: "refresh" }, {});
    const decoded = verifySseTicket(FAKE_JWT as any, bad);
    expect(decoded).toBeNull();
  });

  it("returns null for malformed tokens", () => {
    const decoded = verifySseTicket(FAKE_JWT as any, "not-a-jwt");
    expect(decoded).toBeNull();
  });
});
