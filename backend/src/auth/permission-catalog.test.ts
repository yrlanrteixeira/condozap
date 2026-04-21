import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSION_KEYS,
  CONDO_ASSIGNABLE_PERMISSION_KEYS,
  SECTOR_ASSIGNABLE_PERMISSION_KEYS,
  isCondoAssignableKey,
  isKnownPermissionKey,
  isSectorAssignableKey,
} from "./permission-catalog";

describe("permission-catalog", () => {
  it("ALL_PERMISSION_KEYS contains known canonical keys", () => {
    expect(ALL_PERMISSION_KEYS).toContain("view:dashboard");
    expect(ALL_PERMISSION_KEYS).toContain("manage:syndics");
    expect(ALL_PERMISSION_KEYS).toContain("submit:csat");
  });

  it("has no duplicate entries", () => {
    const set = new Set(ALL_PERMISSION_KEYS);
    expect(set.size).toBe(ALL_PERMISSION_KEYS.length);
  });

  it("CONDO_ASSIGNABLE_PERMISSION_KEYS excludes platform-only keys", () => {
    const platformOnly = [
      "view:platform_dashboard",
      "manage:syndics",
      "manage:billing_platform",
      "create:condominium",
      "delete:condominium",
    ];
    for (const key of platformOnly) {
      expect(CONDO_ASSIGNABLE_PERMISSION_KEYS).not.toContain(key);
    }
  });

  it("CONDO_ASSIGNABLE_PERMISSION_KEYS is a strict subset of ALL_PERMISSION_KEYS", () => {
    for (const key of CONDO_ASSIGNABLE_PERMISSION_KEYS) {
      expect(ALL_PERMISSION_KEYS).toContain(key);
    }
    expect(CONDO_ASSIGNABLE_PERMISSION_KEYS.length).toBeLessThan(
      ALL_PERMISSION_KEYS.length
    );
  });

  it("SECTOR_ASSIGNABLE_PERMISSION_KEYS is a subset of CONDO_ASSIGNABLE", () => {
    for (const key of SECTOR_ASSIGNABLE_PERMISSION_KEYS) {
      expect(CONDO_ASSIGNABLE_PERMISSION_KEYS).toContain(key);
    }
  });

  it("isKnownPermissionKey recognises catalog keys and rejects unknown", () => {
    expect(isKnownPermissionKey("view:dashboard")).toBe(true);
    expect(isKnownPermissionKey("totally:fake")).toBe(false);
  });

  it("isCondoAssignableKey: true for assignable, false for platform-only", () => {
    expect(isCondoAssignableKey("view:dashboard")).toBe(true);
    expect(isCondoAssignableKey("create:condominium")).toBe(false);
  });

  it("isSectorAssignableKey: true for operational sector keys, false otherwise", () => {
    expect(isSectorAssignableKey("view:complaints")).toBe(true);
    expect(isSectorAssignableKey("manage:roles")).toBe(false);
  });
});
