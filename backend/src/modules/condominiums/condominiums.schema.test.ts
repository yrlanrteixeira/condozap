import { describe, expect, it } from "vitest";
import {
  createCondominiumSchema,
  updateCondominiumSchema,
  updateCondominiumSettingsSchema,
  condominiumStatusEnum,
} from "./condominiums.schema";

describe("condominiums.schema — condominiumStatusEnum", () => {
  it.each(["TRIAL", "ACTIVE", "SUSPENDED"] as const)("accepts %s", (s) => {
    expect(condominiumStatusEnum.parse(s)).toBe(s);
  });
  it("rejects unknown statuses", () => {
    expect(condominiumStatusEnum.safeParse("DELETED").success).toBe(false);
  });
});

describe("condominiums.schema — createCondominiumSchema", () => {
  const base = { name: "Edifício Alpha", cnpj: "12345678901234" };

  it("accepts minimal valid payload", () => {
    const parsed = createCondominiumSchema.parse(base);
    expect(parsed.name).toBe("Edifício Alpha");
  });

  it("accepts optional slug and WhatsApp fields", () => {
    const parsed = createCondominiumSchema.parse({
      ...base,
      slug: "edificio-alpha",
      whatsappPhone: "11999999999",
      whatsappBusinessId: "bid-1",
    });
    expect(parsed.slug).toBe("edificio-alpha");
    expect(parsed.whatsappPhone).toBe("11999999999");
  });

  it("rejects short name", () => {
    expect(createCondominiumSchema.safeParse({ ...base, name: "Ab" }).success).toBe(false);
  });

  it("rejects missing cnpj", () => {
    expect(createCondominiumSchema.safeParse({ name: "Valid Name" }).success).toBe(false);
  });

  it("rejects slug shorter than 2 chars", () => {
    expect(
      createCondominiumSchema.safeParse({ ...base, slug: "a" }).success
    ).toBe(false);
  });

  it("rejects slug longer than 100 chars", () => {
    expect(
      createCondominiumSchema.safeParse({ ...base, slug: "a".repeat(101) }).success
    ).toBe(false);
  });
});

describe("condominiums.schema — updateCondominiumSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(updateCondominiumSchema.parse({})).toEqual({});
  });

  it("accepts status update", () => {
    const parsed = updateCondominiumSchema.parse({ status: "SUSPENDED" });
    expect(parsed.status).toBe("SUSPENDED");
  });

  it("accepts nullable whatsapp fields", () => {
    const parsed = updateCondominiumSchema.parse({
      whatsappPhone: null,
      whatsappBusinessId: null,
    });
    expect(parsed.whatsappPhone).toBeNull();
  });

  it("accepts structure record", () => {
    const parsed = updateCondominiumSchema.parse({
      structure: { towers: ["A", "B"] },
    });
    expect(parsed.structure).toEqual({ towers: ["A", "B"] });
  });

  it("rejects invalid status", () => {
    expect(
      updateCondominiumSchema.safeParse({ status: "EXTINCT" }).success
    ).toBe(false);
  });
});

describe("condominiums.schema — updateCondominiumSettingsSchema", () => {
  it("accepts empty object", () => {
    expect(updateCondominiumSettingsSchema.parse({})).toEqual({});
  });

  it("accepts name + structure + whatsapp", () => {
    const parsed = updateCondominiumSettingsSchema.parse({
      name: "New Name",
      structure: { towers: ["A"] },
      whatsappPhone: "11999999999",
    });
    expect(parsed.name).toBe("New Name");
  });

  it("rejects short name", () => {
    expect(
      updateCondominiumSettingsSchema.safeParse({ name: "x" }).success
    ).toBe(false);
  });

  it("does not allow status changes (not in schema)", () => {
    const parsed = updateCondominiumSettingsSchema.parse({
      name: "OK Name",
      status: "SUSPENDED", // ignored
    } as never);
    expect((parsed as { status?: string }).status).toBeUndefined();
  });
});
