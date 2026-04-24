import { describe, expect, it } from "vitest";
import { sendTextSchema, checkNumbersSchema } from "./evolution.schema";

describe("evolution.schema — sendTextSchema", () => {
  it("accepts valid payload", () => {
    const parsed = sendTextSchema.parse({ phone: "5511987654321", message: "x" });
    expect(parsed.phone).toBe("5511987654321");
  });
  it("rejects empty phone", () => {
    expect(sendTextSchema.safeParse({ phone: "", message: "x" }).success).toBe(
      false
    );
  });
  it("rejects empty message", () => {
    expect(sendTextSchema.safeParse({ phone: "x", message: "" }).success).toBe(
      false
    );
  });
});

describe("evolution.schema — checkNumbersSchema", () => {
  it("accepts numbers array", () => {
    const parsed = checkNumbersSchema.parse({ numbers: ["5511987654321"] });
    expect(parsed.numbers).toHaveLength(1);
  });
  it("rejects non-array", () => {
    expect(checkNumbersSchema.safeParse({ numbers: "nope" }).success).toBe(false);
  });
  it("rejects empty string entry", () => {
    expect(checkNumbersSchema.safeParse({ numbers: [""] }).success).toBe(false);
  });
});
