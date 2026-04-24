import { describe, expect, it } from "vitest";
import {
  createCannedResponseSchema,
  updateCannedResponseSchema,
} from "./canned-responses.schema";

describe("canned-responses.schema — createCannedResponseSchema", () => {
  it("accepts a minimal valid payload (title + content)", () => {
    const result = createCannedResponseSchema.parse({
      title: "Welcome",
      content: "Hi there",
    });
    expect(result.title).toBe("Welcome");
    expect(result.content).toBe("Hi there");
    expect(result.condominiumId).toBeUndefined();
    expect(result.sectorId).toBeUndefined();
  });

  it("accepts condominiumId and sectorId", () => {
    const result = createCannedResponseSchema.parse({
      title: "Escalation",
      content: "We'll respond within 24h",
      condominiumId: "c-1",
      sectorId: "s-1",
    });
    expect(result.condominiumId).toBe("c-1");
    expect(result.sectorId).toBe("s-1");
  });

  it("rejects empty title", () => {
    const result = createCannedResponseSchema.safeParse({
      title: "",
      content: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 100 chars", () => {
    const result = createCannedResponseSchema.safeParse({
      title: "a".repeat(101),
      content: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = createCannedResponseSchema.safeParse({
      title: "ok",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects content longer than 2000 chars", () => {
    const result = createCannedResponseSchema.safeParse({
      title: "ok",
      content: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(createCannedResponseSchema.safeParse({}).success).toBe(false);
    expect(createCannedResponseSchema.safeParse({ title: "t" }).success).toBe(false);
    expect(createCannedResponseSchema.safeParse({ content: "c" }).success).toBe(false);
  });
});

describe("canned-responses.schema — updateCannedResponseSchema", () => {
  it("accepts empty payload (all fields optional)", () => {
    const result = updateCannedResponseSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts partial update with only title", () => {
    const result = updateCannedResponseSchema.parse({ title: "New title" });
    expect(result.title).toBe("New title");
  });

  it("accepts null sectorId (unlinking sector)", () => {
    const result = updateCannedResponseSchema.parse({ sectorId: null });
    expect(result.sectorId).toBeNull();
  });

  it("rejects empty title when provided", () => {
    const result = updateCannedResponseSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects content longer than 2000 chars when provided", () => {
    const result = updateCannedResponseSchema.safeParse({
      content: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
