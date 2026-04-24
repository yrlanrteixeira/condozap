import { describe, expect, it } from "vitest";
import { createPlanSchema, updatePlanSchema } from "./plans.schema";

describe("createPlanSchema", () => {
  it("accepts a valid payload and applies defaults", () => {
    const parsed = createPlanSchema.parse({
      slug: "basic",
      displayName: "Basic",
      minCondominiums: 1,
      maxCondominiums: 5,
      pricePerCondoCents: 4990,
    });
    expect(parsed.setupFeeCents).toBe(200000);
    expect(parsed.sortOrder).toBe(0);
  });

  it("rejects negative pricePerCondoCents", () => {
    expect(() =>
      createPlanSchema.parse({
        slug: "x",
        displayName: "X",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: -1,
      }),
    ).toThrow();
  });

  it("rejects empty slug", () => {
    expect(() =>
      createPlanSchema.parse({
        slug: "",
        displayName: "X",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: 100,
      }),
    ).toThrow();
  });
});

describe("updatePlanSchema", () => {
  it("accepts partial payloads", () => {
    expect(updatePlanSchema.parse({ displayName: "Pro" })).toEqual({
      displayName: "Pro",
    });
  });

  it("accepts isActive toggle", () => {
    expect(updatePlanSchema.parse({ isActive: false })).toEqual({
      isActive: false,
    });
  });
});
