import roleCeilingJson from "./role-ceiling.json";

/**
 * Sistema de Permissões do TalkZap
 *
 * Perfis:
 * - SUPER_ADMIN: operador de plataforma SaaS. Gerencia CRUD de condomínios,
 *   contas de síndicos, planos e financeiro da plataforma. NÃO tem acesso
 *   operacional a condomínios (ocorrências, moradores, mensagens, etc).
 * - PROFESSIONAL_SYNDIC: síndico profissional que gerencia múltiplos condomínios.
 * - ADMIN: Conselheiro — apoio ao síndico com acesso operacional, sem poder
 *   criar/editar outros usuários de nível gerencial.
 * - SYNDIC: síndico de condomínio (pode gerenciar um ou múltiplos).
 * - TRIAGE / SETOR_MANAGER / SETOR_MEMBER: perfis operacionais (ocorrências).
 * - RESIDENT: morador — vê apenas as próprias ocorrências.
 */

export const UserRoles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PROFESSIONAL_SYNDIC: "PROFESSIONAL_SYNDIC",
  ADMIN: "ADMIN",
  SYNDIC: "SYNDIC",
  TRIAGE: "TRIAGE",
  SETOR_MANAGER: "SETOR_MANAGER",
  SETOR_MEMBER: "SETOR_MEMBER",
  RESIDENT: "RESIDENT",
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRoles.SUPER_ADMIN]: "Super Administrador",
  [UserRoles.PROFESSIONAL_SYNDIC]: "Síndico Profissional",
  [UserRoles.ADMIN]: "Conselheiro",
  [UserRoles.SYNDIC]: "Síndico",
  [UserRoles.TRIAGE]: "Triagem",
  [UserRoles.SETOR_MANAGER]: "Gestor de Setor",
  [UserRoles.SETOR_MEMBER]: "Membro de Setor",
  [UserRoles.RESIDENT]: "Morador",
};

/**
 * Permissões do sistema
 * Organizadas por módulo/funcionalidade
 */
export const Permissions = {
  // Dashboard
  VIEW_DASHBOARD: "view:dashboard",
  VIEW_UNIFIED_DASHBOARD: "view:unified_dashboard", // Dashboard unificado (múltiplos condomínios)
  VIEW_METRICS: "view:metrics",
  VIEW_ALL_METRICS: "view:all_metrics", // Métricas de todos os condomínios

  // Condomínios
  VIEW_CONDOMINIUMS: "view:condominiums",
  CREATE_CONDOMINIUM: "create:condominium",
  EDIT_CONDOMINIUM: "edit:condominium",
  DELETE_CONDOMINIUM: "delete:condominium",
  SWITCH_CONDOMINIUM: "switch:condominium", // Trocar entre condomínios

  // Estrutura (Torres, Andares, Unidades)
  VIEW_STRUCTURE: "view:structure",
  EDIT_STRUCTURE: "edit:structure",
  MANAGE_STRUCTURE: "manage:structure", // Criar/Editar/Deletar estrutura

  // Moradores
  VIEW_RESIDENTS: "view:residents",
  VIEW_ALL_RESIDENTS: "view:all_residents", // Todos os moradores do condomínio
  VIEW_OWN_PROFILE: "view:own_profile", // Ver próprio perfil (RESIDENT)
  CREATE_RESIDENT: "create:resident",
  EDIT_RESIDENT: "edit:resident",
  DELETE_RESIDENT: "delete:resident",
  MANAGE_CONSENT: "manage:consent", // Gerenciar consentimentos (LGPD)
  MANAGE_RESIDENTS: "manage:residents", // Gerenciar moradores (aprovação, etc)

  // Denúncias/Reclamações
  VIEW_COMPLAINTS: "view:complaints",
  VIEW_ALL_COMPLAINTS: "view:all_complaints", // Todas as denúncias
  VIEW_OWN_COMPLAINTS: "view:own_complaints", // Apenas próprias denúncias (RESIDENT)
  CREATE_COMPLAINT: "create:complaint",
  EDIT_COMPLAINT: "edit:complaint",
  UPDATE_COMPLAINT_STATUS: "update:complaint_status",
  UPDATE_COMPLAINT_PRIORITY: "update:complaint_priority",
  DELETE_COMPLAINT: "delete:complaint",
  /** Comentário em ocorrência (setor / granular) */
  COMMENT_COMPLAINT: "comment:complaint",
  RESOLVE_COMPLAINT: "resolve:complaint",
  RETURN_COMPLAINT: "return:complaint",
  REASSIGN_COMPLAINT: "reassign:complaint",
  VIEW_ANONYMOUS_COMPLAINTS: "view:anonymous_complaints", // Ver autor de denúncias anônimas

  // Mensagens/Comunicados
  VIEW_MESSAGES: "view:messages",
  VIEW_MESSAGE_HISTORY: "view:message_history",
  SEND_MESSAGE: "send:message",
  SEND_BULK_MESSAGE: "send:bulk_message", // Enviar mensagem em massa
  SEND_TO_ALL: "send:to_all", // Enviar para todos moradores
  SEND_TO_TOWER: "send:to_tower", // Enviar para torre específica
  SEND_TO_FLOOR: "send:to_floor", // Enviar para andar específico
  SEND_TO_UNIT: "send:to_unit", // Enviar para unidade específica

  // WhatsApp
  VIEW_WHATSAPP_STATUS: "view:whatsapp_status",
  MANAGE_WHATSAPP: "manage:whatsapp",

  // Histórico/Logs
  VIEW_HISTORY: "view:history",
  VIEW_ALL_HISTORY: "view:all_history", // Histórico completo de ações
  VIEW_AUDIT_LOG: "view:audit_log", // Logs de auditoria

  // Usuários (gestão de acessos)
  VIEW_USERS: "view:users",
  CREATE_USER: "create:user",
  EDIT_USER: "edit:user",
  DELETE_USER: "delete:user",
  MANAGE_ROLES: "manage:roles", // Gerenciar perfis de usuários

  // Relatórios
  VIEW_REPORTS: "view:reports",
  EXPORT_REPORTS: "export:reports",
  EXPORT_RESIDENTS: "export:residents",

  // Configurações
  VIEW_SETTINGS: "view:settings",
  EDIT_SETTINGS: "edit:settings",
  EDIT_SYSTEM_SETTINGS: "edit:system_settings", // Configurações globais do sistema

  // Plataforma
  VIEW_PLATFORM_DASHBOARD: "view:platform_dashboard",
  MANAGE_SYNDICS: "manage:syndics",
  MANAGE_TEAM: "manage:team",

  // Assinatura / Financeiro (SaaS)
  VIEW_BILLING: "view:billing",               // Ver própria assinatura (síndico)
  MANAGE_BILLING_PLATFORM: "manage:billing_platform", // Gerenciar planos e financeiro (SUPER_ADMIN)

  // Comunicados
  VIEW_ANNOUNCEMENTS: "view:announcements",
  CREATE_ANNOUNCEMENT: "create:announcement",

  // Avaliação
  SUBMIT_CSAT: "submit:csat",

  // Setor
  VIEW_SECTOR_DASHBOARD: "view_sector_dashboard",
  VIEW_SECTOR_COMPLAINTS: "view_sector_complaints",
} as const;

/**
 * Teto por papel (fonte única: `role-ceiling.json`, alinhada ao backend).
 */
export const RolePermissions = roleCeilingJson as Record<UserRole, string[]>;

/**
 * Verifica se o usuário tem uma permissão específica
 */
export function hasPermission(
  userRole: UserRole | null | undefined,
  permission: string
): boolean {
  if (!userRole) return false;
  return RolePermissions[userRole]?.includes(permission) || false;
}

/**
 * Verifica se o usuário tem pelo menos uma das permissões listadas
 */
export function hasAnyPermission(
  userRole: UserRole | null | undefined,
  permissions: string[]
): boolean {
  if (!userRole) return false;
  return permissions.some((permission) => hasPermission(userRole, permission));
}

/**
 * Verifica se o usuário tem todas as permissões listadas
 */
export function hasAllPermissions(
  userRole: UserRole | null | undefined,
  permissions: string[]
): boolean {
  if (!userRole) return false;
  return permissions.every((permission) => hasPermission(userRole, permission));
}

/**
 * Verifica se o perfil do usuário é válido
 */
export function isValidUserRole(userRole: string | undefined | null): boolean {
  if (!userRole) return false;
  return Object.values(UserRoles).includes(userRole as UserRole);
}

/**
 * Verifica se o usuário é SUPER_ADMIN
 */
export function isSuperAdmin(userRole: UserRole | undefined | null): boolean {
  return userRole === UserRoles.SUPER_ADMIN;
}

/**
 * Verifica se o usuário é PROFESSIONAL_SYNDIC
 */
export function isProfessionalSyndic(
  userRole: UserRole | undefined | null
): boolean {
  return userRole === UserRoles.PROFESSIONAL_SYNDIC;
}

/**
 * Verifica se o usuário é ADMIN
 */
export function isAdmin(userRole: UserRole | undefined | null): boolean {
  return userRole === UserRoles.ADMIN;
}

/**
 * Verifica se o usuário é SYNDIC
 */
export function isSyndic(userRole: UserRole | undefined | null): boolean {
  return userRole === UserRoles.SYNDIC;
}

/**
 * Verifica se o usuário é RESIDENT
 */
export function isResident(userRole: UserRole | undefined | null): boolean {
  return userRole === UserRoles.RESIDENT;
}

/**
 * Verifica se o usuário tem permissão de administrador **dentro de um
 * condomínio** (PROFESSIONAL_SYNDIC, SYNDIC ou ADMIN/Conselheiro).
 *
 * Importante: SUPER_ADMIN NÃO é condo-admin. Ele é operador de
 * plataforma e não gerencia condomínios operacionalmente.
 */
export function isAdminLevel(userRole: UserRole | undefined | null): boolean {
  if (!userRole) return false;
  const adminRoles: UserRole[] = [
    UserRoles.PROFESSIONAL_SYNDIC,
    UserRoles.SYNDIC,
    UserRoles.ADMIN,
  ];
  return adminRoles.includes(userRole);
}

/**
 * Verifica se o usuário tem permissão de gestão (não é RESIDENT)
 */
export function isManagementLevel(
  userRole: UserRole | undefined | null
): boolean {
  if (!userRole) return false;
  return userRole !== UserRoles.RESIDENT;
}

/**
 * Verifica se role1 tem hierarquia maior ou igual a role2
 * Hierarquia: SUPER_ADMIN > PROFESSIONAL_SYNDIC > ADMIN > SYNDIC > RESIDENT
 */
export function hasRoleHierarchy(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  const hierarchy: Record<UserRole, number> = {
    [UserRoles.SUPER_ADMIN]: 5,
    [UserRoles.PROFESSIONAL_SYNDIC]: 4,
    [UserRoles.ADMIN]: 3,
    [UserRoles.SYNDIC]: 2,
    [UserRoles.TRIAGE]: 2,
    [UserRoles.SETOR_MANAGER]: 2,
    [UserRoles.SETOR_MEMBER]: 2,
    [UserRoles.RESIDENT]: 1,
  };

  return hierarchy[userRole] >= hierarchy[requiredRole];
}

/**
 * Obtém o nível de hierarquia de um perfil
 */
export function getRoleHierarchyLevel(userRole: UserRole): number {
  const hierarchy: Record<UserRole, number> = {
    [UserRoles.SUPER_ADMIN]: 5,
    [UserRoles.PROFESSIONAL_SYNDIC]: 4,
    [UserRoles.ADMIN]: 3,
    [UserRoles.SYNDIC]: 2,
    [UserRoles.TRIAGE]: 2,
    [UserRoles.SETOR_MANAGER]: 2,
    [UserRoles.SETOR_MEMBER]: 2,
    [UserRoles.RESIDENT]: 1,
  };

  return hierarchy[userRole] || 0;
}
