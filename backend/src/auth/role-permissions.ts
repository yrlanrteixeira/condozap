import type { UserRole } from "@prisma/client";
import roleCeilingJson from "./data/role-ceiling.json";

const roleCeiling = roleCeilingJson as Record<string, readonly string[]>;

export function getRoleCeiling(role: UserRole): string[] {
  const list = roleCeiling[role];
  return list ? [...list] : [];
}

export function intersectPermissions(
  ceiling: string[],
  requested: string[]
): string[] {
  const r = new Set(requested);
  return ceiling.filter((c) => r.has(c));
}
