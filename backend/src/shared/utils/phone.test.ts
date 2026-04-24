import { describe, expect, it } from "vitest";
import { normalizePhoneDigits, toWhatsAppDigits } from "./phone";

describe("normalizePhoneDigits", () => {
  it("strips all non-digits", () => {
    expect(normalizePhoneDigits("(11) 99876-5432")).toBe("11998765432");
    expect(normalizePhoneDigits("+55 11 98765-4321")).toBe("5511987654321");
    expect(normalizePhoneDigits("  12345  ")).toBe("12345");
  });

  it("returns empty string for no-digit input", () => {
    expect(normalizePhoneDigits("abc")).toBe("");
    expect(normalizePhoneDigits("")).toBe("");
  });
});

describe("toWhatsAppDigits", () => {
  it("adds 55 prefix to BR mobile numbers without country code", () => {
    expect(toWhatsAppDigits("11987654321")).toBe("5511987654321");
    expect(toWhatsAppDigits("(11) 98765-4321")).toBe("5511987654321");
  });

  it("adds 55 prefix to BR landlines (10 digits)", () => {
    expect(toWhatsAppDigits("1133334444")).toBe("551133334444");
  });

  it("keeps existing 55 prefix without duplicating", () => {
    expect(toWhatsAppDigits("5511987654321")).toBe("5511987654321");
    expect(toWhatsAppDigits("+55 11 98765-4321")).toBe("5511987654321");
  });

  it("strips leading zeros when producing standard BR size", () => {
    expect(toWhatsAppDigits("011987654321")).toBe("5511987654321");
  });

  it("removes duplicated 55 when result exceeds normal max", () => {
    expect(toWhatsAppDigits("555511987654321")).toBe("5511987654321");
  });

  it("returns digits unchanged if no rule applies (very short)", () => {
    expect(toWhatsAppDigits("1234")).toBe("1234");
  });

  it("handles DDD 55 (Rio Grande do Sul) correctly without stripping", () => {
    // 55 + 55 DDD + 9-digit mobile = 13 digits total, should pass through
    expect(toWhatsAppDigits("5555987654321")).toBe("5555987654321");
  });
});
