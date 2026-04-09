import { describe, expect, it } from "vitest";
import { intersectPermissions } from "./role-permissions";

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
