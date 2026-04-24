import { describe, expect, it } from "vitest";
import { createManualBillSchema } from "./bills.schema";

describe("createManualBillSchema", () => {
  it("applies default description when omitted", () => {
    const parsed = createManualBillSchema.parse({ amountCents: 500 });
    expect(parsed.description).toBe("Cobrança manual");
  });

  it("rejects amountCents below 100", () => {
    expect(() => createManualBillSchema.parse({ amountCents: 50 })).toThrow();
  });

  it("rejects non-integer amounts", () => {
    expect(() => createManualBillSchema.parse({ amountCents: 100.5 })).toThrow();
  });

  it("rejects descriptions longer than 200 chars", () => {
    expect(() =>
      createManualBillSchema.parse({
        amountCents: 1000,
        description: "a".repeat(201),
      }),
    ).toThrow();
  });

  it("rejects empty description", () => {
    expect(() =>
      createManualBillSchema.parse({ amountCents: 1000, description: "" }),
    ).toThrow();
  });
});
