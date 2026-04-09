import type { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getRoleCeiling, intersectPermissions } from "./role-permissions";

const ALL_USER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "PROFESSIONAL_SYNDIC",
  "ADMIN",
  "SYNDIC",
  "TRIAGE",
  "SETOR_MANAGER",
  "SETOR_MEMBER",
  "RESIDENT",
];

describe("getRoleCeiling", () => {
  it("define teto não vazio para cada UserRole do schema", () => {
    for (const role of ALL_USER_ROLES) {
      expect(getRoleCeiling(role).length).toBeGreaterThan(0);
    }
  });
});

describe("intersectPermissions", () => {
  it("preserva a ordem do teto e remove chaves fora dele", () => {
    expect(intersectPermissions(["a", "b", "c"], ["b", "c", "d"])).toEqual([
      "b",
      "c",
    ]);
  });

  it("retorna vazio quando não há interseção", () => {
    expect(intersectPermissions(["a"], ["b"])).toEqual([]);
  });
});
