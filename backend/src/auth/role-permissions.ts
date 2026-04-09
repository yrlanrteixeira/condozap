import type { UserRole } from "@prisma/client";
import roleCeilingJson from "./data/role-ceiling.json";

const roleCeiling = roleCeilingJson as Record<string, readonly string[]>;

/** Deve cobrir todos os valores do enum `UserRole` no schema Prisma. */
const USER_ROLES_REQUIRING_CEILING: readonly UserRole[] = [
  "SUPER_ADMIN",
  "PROFESSIONAL_SYNDIC",
  "ADMIN",
  "SYNDIC",
  "TRIAGE",
  "SETOR_MANAGER",
  "SETOR_MEMBER",
  "RESIDENT",
];

for (const role of USER_ROLES_REQUIRING_CEILING) {
  if (!(role in roleCeiling)) {
    throw new Error(
      `role-ceiling.json: falta a chave "${role}". Atualize backend/src/auth/data/role-ceiling.json e copie para o frontend.`
    );
  }
}

export function getRoleCeiling(role: UserRole): string[] {
  const list = roleCeiling[role];
  if (list === undefined) {
    console.error(
      `[getRoleCeiling] Papel sem teto no JSON: "${String(role)}". Verifique role-ceiling.json.`
    );
    return [];
  }
  return [...list];
}

export function intersectPermissions(
  ceiling: string[],
  requested: string[]
): string[] {
  const r = new Set(requested);
  return ceiling.filter((c) => r.has(c));
}
