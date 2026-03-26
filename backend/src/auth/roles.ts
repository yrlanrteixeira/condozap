export const Roles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PROFESSIONAL_SYNDIC: "PROFESSIONAL_SYNDIC",
  ADMIN: "ADMIN",
  SYNDIC: "SYNDIC",
  TRIAGE: "TRIAGE",
  SETOR_MANAGER: "SETOR_MANAGER",
  SETOR_MEMBER: "SETOR_MEMBER",
  RESIDENT: "RESIDENT",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const Scopes = {
  GLOBAL: "GLOBAL",
  LOCAL: "LOCAL",
} as const;

export type Scope = (typeof Scopes)[keyof typeof Scopes];

export const sectorRoles: Role[] = [Roles.SETOR_MANAGER, Roles.SETOR_MEMBER];

export const syndicRoles: Role[] = [
  Roles.SYNDIC,
  Roles.PROFESSIONAL_SYNDIC,
  Roles.ADMIN,
];

export const triageRoles: Role[] = [Roles.TRIAGE];

export const powerRoles: Role[] = [
  Roles.PROFESSIONAL_SYNDIC,
  Roles.SYNDIC,
  Roles.TRIAGE,
];

export const isSuperAdmin = (role: Role): boolean => role === Roles.SUPER_ADMIN;

export const isSyndic = (role: Role): boolean => syndicRoles.includes(role);

export const isTriage = (role: Role): boolean => triageRoles.includes(role);

export const isSectorRole = (role: Role): boolean => sectorRoles.includes(role);

export const isResident = (role: Role): boolean => role === Roles.RESIDENT;

export const isGlobalScope = (scope?: Scope): boolean =>
  scope === Scopes.GLOBAL;
