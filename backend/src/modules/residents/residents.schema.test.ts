import { describe, expect, it } from "vitest";
import {
  createResidentSchema,
  updateResidentSchema,
  residentFiltersSchema,
  residentIdParamSchema,
  condominiumIdParamSchema,
  updateConsentSchema,
  provisionResidentSchema,
  importResidentsSchema,
  residentTypeEnum,
} from "./residents.schema";

describe("residents.schema — residentTypeEnum", () => {
  it("accepts OWNER and TENANT", () => {
    expect(residentTypeEnum.parse("OWNER")).toBe("OWNER");
    expect(residentTypeEnum.parse("TENANT")).toBe("TENANT");
  });
  it("rejects unknown values", () => {
    expect(residentTypeEnum.safeParse("GUEST").success).toBe(false);
  });
});

describe("residents.schema — createResidentSchema", () => {
  const base = {
    condominiumId: "c1",
    name: "John Doe",
    email: "john@test.local",
    phone: "11987654321",
    tower: "A",
    floor: "2",
    unit: "201",
  };

  it("accepts minimal valid payload and applies defaults", () => {
    const parsed = createResidentSchema.parse(base);
    expect(parsed.type).toBe("OWNER");
    expect(parsed.consentWhatsapp).toBe(true);
    expect(parsed.consentDataProcessing).toBe(true);
  });

  it("accepts TENANT type", () => {
    const parsed = createResidentSchema.parse({ ...base, type: "TENANT" });
    expect(parsed.type).toBe("TENANT");
  });

  it("rejects invalid email", () => {
    expect(createResidentSchema.safeParse({ ...base, email: "notmail" }).success).toBe(false);
  });

  it("rejects name shorter than 3", () => {
    expect(createResidentSchema.safeParse({ ...base, name: "Jo" }).success).toBe(false);
  });

  it("rejects phone shorter than 11 digits", () => {
    expect(createResidentSchema.safeParse({ ...base, phone: "1234567" }).success).toBe(false);
  });

  it("rejects missing condominiumId", () => {
    const { condominiumId: _, ...rest } = base;
    expect(createResidentSchema.safeParse(rest).success).toBe(false);
  });
});

describe("residents.schema — updateResidentSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(updateResidentSchema.parse({})).toEqual({});
  });
  it("accepts partial updates", () => {
    const parsed = updateResidentSchema.parse({ name: "Jane Doe", phone: "11911111111" });
    expect(parsed.name).toBe("Jane Doe");
  });
  it("rejects invalid email when provided", () => {
    expect(updateResidentSchema.safeParse({ email: "bad" }).success).toBe(false);
  });
});

describe("residents.schema — residentFiltersSchema", () => {
  it("accepts empty filters", () => {
    expect(residentFiltersSchema.parse({})).toEqual({});
  });
  it("accepts all filter fields", () => {
    const parsed = residentFiltersSchema.parse({
      condominiumId: "c1",
      tower: "A",
      floor: "2",
      type: "OWNER",
      search: "jo",
    });
    expect(parsed.search).toBe("jo");
  });
});

describe("residents.schema — id params", () => {
  it("residentIdParamSchema requires non-empty id", () => {
    expect(residentIdParamSchema.parse({ id: "r1" }).id).toBe("r1");
    expect(residentIdParamSchema.safeParse({ id: "" }).success).toBe(false);
  });
  it("condominiumIdParamSchema requires condominiumId", () => {
    expect(condominiumIdParamSchema.parse({ condominiumId: "c1" }).condominiumId).toBe("c1");
    expect(condominiumIdParamSchema.safeParse({}).success).toBe(false);
  });
});

describe("residents.schema — updateConsentSchema", () => {
  it("accepts snake_case fields", () => {
    const parsed = updateConsentSchema.parse({ consent_whatsapp: false });
    expect(parsed.consent_whatsapp).toBe(false);
  });
  it("accepts camelCase fields", () => {
    const parsed = updateConsentSchema.parse({ consentDataProcessing: false });
    expect(parsed.consentDataProcessing).toBe(false);
  });
  it("rejects empty body", () => {
    expect(updateConsentSchema.safeParse({}).success).toBe(false);
  });
});

describe("residents.schema — provisionResidentSchema", () => {
  const base = {
    condominiumId: "c1",
    mode: "invite_link" as const,
    name: "Jane",
    phone: "11987654321",
  };
  it("accepts invite_link minimal", () => {
    expect(provisionResidentSchema.parse(base).mode).toBe("invite_link");
  });
  it("accepts temp_password with email+tower+floor+unit", () => {
    const parsed = provisionResidentSchema.parse({
      ...base,
      mode: "temp_password",
      email: "x@test.local",
      tower: "A",
      floor: "1",
      unit: "101",
    });
    expect(parsed.mode).toBe("temp_password");
  });
  it("rejects unknown mode", () => {
    expect(
      provisionResidentSchema.safeParse({ ...base, mode: "otp" }).success
    ).toBe(false);
  });
  it("rejects provisionalPassword shorter than 8", () => {
    expect(
      provisionResidentSchema.safeParse({ ...base, provisionalPassword: "short" }).success
    ).toBe(false);
  });
});

describe("residents.schema — importResidentsSchema", () => {
  const res = {
    name: "A",
    email: "a@test.local",
    phone: "11987654321",
    tower: "A",
    floor: "1",
    unit: "101",
  };
  it("accepts at least one resident", () => {
    const parsed = importResidentsSchema.parse({
      condominiumId: "c1",
      residents: [res],
    });
    expect(parsed.residents).toHaveLength(1);
  });
  it("rejects empty residents array", () => {
    expect(
      importResidentsSchema.safeParse({ condominiumId: "c1", residents: [] }).success
    ).toBe(false);
  });
  it("rejects missing condominiumId", () => {
    expect(
      importResidentsSchema.safeParse({ residents: [res] }).success
    ).toBe(false);
  });
});
