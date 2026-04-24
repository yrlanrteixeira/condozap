import { describe, expect, it } from "vitest";
import {
  isValidCondominiumSlugFormat,
  normalizeCondominiumSlug,
  slugFromName,
} from "./condominium-slug";

describe("normalizeCondominiumSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(normalizeCondominiumSlug("Meu Condomínio Legal")).toBe(
      "meu-condom-nio-legal"
    );
  });

  it("trims leading/trailing hyphens", () => {
    expect(normalizeCondominiumSlug("  ---hello---  ")).toBe("hello");
  });

  it("collapses multiple hyphens", () => {
    expect(normalizeCondominiumSlug("a---b")).toBe("a-b");
  });

  it("removes accents/special chars (replaced by hyphens then collapsed)", () => {
    expect(normalizeCondominiumSlug("São Paulo!")).toBe("s-o-paulo");
  });

  it("returns empty string when input has no alnum characters", () => {
    expect(normalizeCondominiumSlug("@@@")).toBe("");
  });
});

describe("slugFromName", () => {
  it("produces a normalized slug from a name", () => {
    expect(slugFromName("Residencial Primavera")).toBe("residencial-primavera");
  });

  it("falls back to 'condominium' when name is unusable", () => {
    expect(slugFromName("@@@")).toBe("condominium");
    expect(slugFromName("")).toBe("condominium");
  });
});

describe("isValidCondominiumSlugFormat", () => {
  it("accepts valid slugs", () => {
    expect(isValidCondominiumSlugFormat("abc")).toBe(true);
    expect(isValidCondominiumSlugFormat("a1-b2-c3")).toBe(true);
  });

  it("rejects too short or too long slugs", () => {
    expect(isValidCondominiumSlugFormat("a")).toBe(false);
    expect(isValidCondominiumSlugFormat("a".repeat(101))).toBe(false);
  });

  it("rejects slugs with invalid chars or positions", () => {
    expect(isValidCondominiumSlugFormat("ABC")).toBe(false); // uppercase
    expect(isValidCondominiumSlugFormat("-abc")).toBe(false);
    expect(isValidCondominiumSlugFormat("abc-")).toBe(false);
    expect(isValidCondominiumSlugFormat("a--b")).toBe(false);
    expect(isValidCondominiumSlugFormat("a b")).toBe(false);
    expect(isValidCondominiumSlugFormat("ção")).toBe(false);
  });
});
