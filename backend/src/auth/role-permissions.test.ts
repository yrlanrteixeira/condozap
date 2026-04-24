import type { UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
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

  it("returns a copy (mutation does not leak to the catalog)", () => {
    const first = getRoleCeiling("SYNDIC");
    first.push("mutation-test");
    const second = getRoleCeiling("SYNDIC");
    expect(second).not.toContain("mutation-test");
  });

  it("returns [] and warns for a role not in the catalog", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = getRoleCeiling("NOT_A_ROLE" as UserRole);
    expect(out).toEqual([]);
    expect(spy).toHaveBeenCalledOnce();
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

  it("retorna vazio quando o teto é vazio", () => {
    expect(intersectPermissions([], ["a", "b"])).toEqual([]);
  });

  it("retorna vazio quando requested é vazio", () => {
    expect(intersectPermissions(["a", "b"], [])).toEqual([]);
  });

  it("deduplicação: teto com entradas duplicadas é preservado (o teto é source of truth)", () => {
    // intersectPermissions não deduplica ativamente; apenas filtra.
    expect(intersectPermissions(["a", "a", "b"], ["a"])).toEqual(["a", "a"]);
  });
});
