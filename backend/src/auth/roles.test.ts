import { describe, expect, it } from "vitest";
import {
  Roles,
  Scopes,
  isGlobalScope,
  isResident,
  isSectorRole,
  isSuperAdmin,
  isSyndic,
  isTriage,
  powerRoles,
  sectorRoles,
  syndicRoles,
  triageRoles,
} from "./roles";

describe("roles constants", () => {
  it("Roles map values equal their keys", () => {
    for (const [key, value] of Object.entries(Roles)) {
      expect(value).toBe(key);
    }
  });

  it("Scopes values", () => {
    expect(Scopes.GLOBAL).toBe("GLOBAL");
    expect(Scopes.LOCAL).toBe("LOCAL");
  });

  it("sectorRoles / syndicRoles / triageRoles / powerRoles expose the expected membership", () => {
    expect(sectorRoles).toEqual([Roles.SETOR_MANAGER, Roles.SETOR_MEMBER]);
    expect(syndicRoles).toEqual([
      Roles.SYNDIC,
      Roles.PROFESSIONAL_SYNDIC,
      Roles.ADMIN,
    ]);
    expect(triageRoles).toEqual([Roles.TRIAGE]);
    expect(powerRoles).toEqual([
      Roles.PROFESSIONAL_SYNDIC,
      Roles.SYNDIC,
      Roles.TRIAGE,
    ]);
  });
});

describe("isSuperAdmin", () => {
  it("true only for SUPER_ADMIN", () => {
    expect(isSuperAdmin(Roles.SUPER_ADMIN)).toBe(true);
    expect(isSuperAdmin(Roles.SYNDIC)).toBe(false);
  });
});

describe("isSyndic", () => {
  it.each([Roles.SYNDIC, Roles.PROFESSIONAL_SYNDIC, Roles.ADMIN])(
    "true for %s",
    (role) => {
      expect(isSyndic(role)).toBe(true);
    }
  );

  it.each([
    Roles.SUPER_ADMIN,
    Roles.TRIAGE,
    Roles.SETOR_MANAGER,
    Roles.SETOR_MEMBER,
    Roles.RESIDENT,
  ])("false for %s", (role) => {
    expect(isSyndic(role)).toBe(false);
  });
});

describe("isTriage", () => {
  it("true only for TRIAGE", () => {
    expect(isTriage(Roles.TRIAGE)).toBe(true);
    expect(isTriage(Roles.SYNDIC)).toBe(false);
  });
});

describe("isSectorRole", () => {
  it.each([Roles.SETOR_MANAGER, Roles.SETOR_MEMBER])(
    "true for %s",
    (role) => {
      expect(isSectorRole(role)).toBe(true);
    }
  );

  it("false for others", () => {
    expect(isSectorRole(Roles.SYNDIC)).toBe(false);
    expect(isSectorRole(Roles.RESIDENT)).toBe(false);
  });
});

describe("isResident", () => {
  it("true only for RESIDENT", () => {
    expect(isResident(Roles.RESIDENT)).toBe(true);
    expect(isResident(Roles.SYNDIC)).toBe(false);
  });
});

describe("isGlobalScope", () => {
  it("true only for GLOBAL", () => {
    expect(isGlobalScope(Scopes.GLOBAL)).toBe(true);
    expect(isGlobalScope(Scopes.LOCAL)).toBe(false);
    expect(isGlobalScope(undefined)).toBe(false);
  });
});
