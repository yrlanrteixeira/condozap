import { describe, expect, it } from "vitest";
import { detectPriority, PRIORITY_KEYWORDS } from "./keywords";

describe("automation.keywords — detectPriority", () => {
  it("returns null when no keyword matches", () => {
    expect(detectPriority("nada de especial aqui")).toBeNull();
  });

  it("detects CRITICAL for 'incêndio'", () => {
    expect(detectPriority("tem um incêndio no andar")).toBe("CRITICAL");
  });

  it("detects CRITICAL for 'vazamento' (case-insensitive)", () => {
    expect(detectPriority("Vazamento grande!")).toBe("CRITICAL");
  });

  it("detects HIGH for 'elevador'", () => {
    expect(detectPriority("o elevador parou")).toBe("HIGH");
  });

  it("detects HIGH for 'queda de energia'", () => {
    expect(detectPriority("houve queda de energia hoje")).toBe("HIGH");
  });

  it("prioritizes the first keyword encountered in object iteration order", () => {
    // content has both CRITICAL ("gás") and HIGH ("elevador") — deterministic,
    // insertion-order: CRITICAL words inserted first, so returns CRITICAL.
    expect(detectPriority("cheiro de gás no elevador")).toBe("CRITICAL");
  });
});

describe("automation.keywords — PRIORITY_KEYWORDS map", () => {
  it("contains the expected CRITICAL words", () => {
    expect(PRIORITY_KEYWORDS["incêndio"]).toBe("CRITICAL");
    expect(PRIORITY_KEYWORDS["vazamento"]).toBe("CRITICAL");
    expect(PRIORITY_KEYWORDS["gás"]).toBe("CRITICAL");
  });

  it("contains the expected HIGH words", () => {
    expect(PRIORITY_KEYWORDS["elevador"]).toBe("HIGH");
    expect(PRIORITY_KEYWORDS["segurança"]).toBe("HIGH");
  });
});
