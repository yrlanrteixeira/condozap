/**
 * Chaves canônicas de permissão (espelho do frontend `Permissions`).
 * Usado para validação de PUT e matriz do síndico.
 */
export const ALL_PERMISSION_KEYS: readonly string[] = [
  "view:dashboard",
  "view:unified_dashboard",
  "view:metrics",
  "view:all_metrics",
  "view:condominiums",
  "create:condominium",
  "edit:condominium",
  "delete:condominium",
  "switch:condominium",
  "view:structure",
  "edit:structure",
  "manage:structure",
  "view:residents",
  "view:all_residents",
  "view:own_profile",
  "create:resident",
  "edit:resident",
  "delete:resident",
  "manage:consent",
  "manage:residents",
  "view:complaints",
  "view:all_complaints",
  "view:own_complaints",
  "create:complaint",
  "edit:complaint",
  "update:complaint_status",
  "update:complaint_priority",
  "delete:complaint",
  "comment:complaint",
  "resolve:complaint",
  "return:complaint",
  "reassign:complaint",
  "view:anonymous_complaints",
  "view:messages",
  "view:message_history",
  "send:message",
  "send:bulk_message",
  "send:to_all",
  "send:to_tower",
  "send:to_floor",
  "send:to_unit",
  "view:whatsapp_status",
  "manage:whatsapp",
  "view:history",
  "view:all_history",
  "view:audit_log",
  "view:users",
  "create:user",
  "edit:user",
  "delete:user",
  "manage:roles",
  "view:reports",
  "export:reports",
  "export:residents",
  "view:settings",
  "edit:settings",
  "edit:system_settings",
  "view:platform_dashboard",
  "manage:syndics",
  "manage:team",
  "view:billing",
  "manage:billing_platform",
  "view:announcements",
  "create:announcement",
  "submit:csat",
  "view_sector_dashboard",
  "view_sector_complaints",
];

const PLATFORM_ONLY = new Set([
  "view:platform_dashboard",
  "manage:syndics",
  "manage:billing_platform",
  "create:condominium",
  "delete:condominium",
]);

/** Permissões que o síndico pode atribuir a funcionários/setores (não plataforma SaaS). */
export const CONDO_ASSIGNABLE_PERMISSION_KEYS: readonly string[] =
  ALL_PERMISSION_KEYS.filter((k) => !PLATFORM_ONLY.has(k));

export const isKnownPermissionKey = (key: string): boolean =>
  ALL_PERMISSION_KEYS.includes(key);

export const isCondoAssignableKey = (key: string): boolean =>
  CONDO_ASSIGNABLE_PERMISSION_KEYS.includes(key);

/**
 * Subconjunto do catálogo de condomínio para o template de permissões de um setor
 * (operação local — não expõe gestão de usuários, exportações amplas, etc.).
 */
const SECTOR_ASSIGNABLE_RAW = [
  "view:dashboard",
  "view:metrics",
  "view:unified_dashboard",
  "view:condominiums",
  "switch:condominium",
  "view:structure",
  "view:residents",
  "view:all_residents",
  "view:complaints",
  "view:all_complaints",
  "view:own_complaints",
  "create:complaint",
  "edit:complaint",
  "update:complaint_status",
  "update:complaint_priority",
  "delete:complaint",
  "view:anonymous_complaints",
  "comment:complaint",
  "resolve:complaint",
  "return:complaint",
  "reassign:complaint",
  "view:messages",
  "view:message_history",
  "send:message",
  "send:bulk_message",
  "send:to_all",
  "send:to_tower",
  "send:to_floor",
  "send:to_unit",
  "view:whatsapp_status",
  "view:history",
  "view:all_history",
  "view:announcements",
  "create:announcement",
  "view_sector_dashboard",
  "view_sector_complaints",
  "submit:csat",
] as const;

export const SECTOR_ASSIGNABLE_PERMISSION_KEYS: readonly string[] =
  SECTOR_ASSIGNABLE_RAW.filter((k) => isCondoAssignableKey(k));

const SECTOR_NON_ASSIGNABLE = SECTOR_ASSIGNABLE_RAW.filter(
  (k) => !isCondoAssignableKey(k)
);
if (SECTOR_NON_ASSIGNABLE.length > 0) {
  throw new Error(
    `SECTOR_ASSIGNABLE_RAW contém chaves fora do catálogo de condomínio: ${SECTOR_NON_ASSIGNABLE.join(", ")}`
  );
}

export const isSectorAssignableKey = (key: string): boolean =>
  SECTOR_ASSIGNABLE_PERMISSION_KEYS.includes(key);
