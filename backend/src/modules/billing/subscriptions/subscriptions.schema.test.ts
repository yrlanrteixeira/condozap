import { describe, expect, it } from "vitest";
import {
  assignPlanSchema,
  extendTrialSchema,
  reactivateSchema,
} from "./subscriptions.schema";

describe("extendTrialSchema", () => {
  it("accepts 1..365 days", () => {
    expect(extendTrialSchema.parse({ days: 30 })).toEqual({ days: 30 });
  });
  it("rejects < 1 and > 365", () => {
    expect(() => extendTrialSchema.parse({ days: 0 })).toThrow();
    expect(() => extendTrialSchema.parse({ days: 366 })).toThrow();
  });
});

describe("reactivateSchema", () => {
  it("defaults periodEndDays to 30", () => {
    expect(reactivateSchema.parse({})).toEqual({ periodEndDays: 30 });
  });
  it("rejects negative periodEndDays", () => {
    expect(() => reactivateSchema.parse({ periodEndDays: -1 })).toThrow();
  });
});

describe("assignPlanSchema", () => {
  it("defaults periodEndDays", () => {
    expect(assignPlanSchema.parse({ planId: "p" })).toEqual({
      planId: "p",
      periodEndDays: 30,
    });
  });
  it("requires a planId", () => {
    expect(() => assignPlanSchema.parse({ periodEndDays: 30 })).toThrow();
    expect(() => assignPlanSchema.parse({ planId: "" })).toThrow();
  });
});
