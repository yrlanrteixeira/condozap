import { describe, expect, it } from "vitest";
import { generateRawInviteToken, hashInviteToken } from "./invite-token";

describe("generateRawInviteToken", () => {
  it("returns a 64-char hex string (32 bytes)", () => {
    const token = generateRawInviteToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces unique tokens on successive calls", () => {
    const a = generateRawInviteToken();
    const b = generateRawInviteToken();
    expect(a).not.toBe(b);
  });
});

describe("hashInviteToken", () => {
  it("returns a deterministic 64-char hex hash for the same input", () => {
    const h1 = hashInviteToken("abc");
    const h2 = hashInviteToken("abc");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashInviteToken("a")).not.toBe(hashInviteToken("b"));
  });
});
