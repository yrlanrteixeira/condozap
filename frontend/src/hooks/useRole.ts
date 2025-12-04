/**
 * Custom Hook: useRole
 * Verifica roles e permissões do usuário logado
 */

import { useAppSelector } from "./useAppSelector";
import { selectUserRole } from "@/store/slices/authSlice";
import type { UserRole } from "@/types/user";
import {
  UserRoles,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRoleHierarchy,
  isSuperAdmin,
  isProfessionalSyndic,
  isAdmin,
  isSyndic,
  isResident,
  isAdminLevel,
  isManagementLevel,
  getRoleHierarchyLevel,
} from "@/config/permissions";

/**
 * Hook para verificação de roles e permissões do usuário
 *
 * Fornece métodos convenientes para lógica de UI baseada em permissões.
 * Usa seletores do Redux para performance otimizada.
 *
 * @example
 * ```tsx
 * const { userRole, isAdmin, canEditResidents } = useRole();
 *
 * if (canEditResidents) {
 *   return <EditButton />;
 * }
 * ```
 */
export const useRole = () => {
  const userRole = useAppSelector(selectUserRole) as
    | UserRole
    | null
    | undefined;

  /**
   * Verifica se o usuário tem uma role específica
   */
  const hasRole = (role: UserRole): boolean => {
    return userRole === role;
  };

  /**
   * Verifica se o usuário tem qualquer uma das roles fornecidas
   */
  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!userRole) return false;
    return roles.includes(userRole);
  };

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  const can = (permission: string): boolean => {
    return hasPermission(userRole, permission);
  };

  /**
   * Verifica se o usuário tem qualquer uma das permissões fornecidas
   */
  const canAny = (permissions: string[]): boolean => {
    return hasAnyPermission(userRole, permissions);
  };

  /**
   * Verifica se o usuário tem todas as permissões fornecidas
   */
  const canAll = (permissions: string[]): boolean => {
    return hasAllPermissions(userRole, permissions);
  };

  /**
   * Verifica hierarquia de roles
   * Exemplo: hasHierarchy('ADMIN') retorna true se for SUPER_ADMIN, PROFESSIONAL_SYNDIC ou ADMIN
   */
  const hasHierarchy = (requiredRole: UserRole): boolean => {
    if (!userRole) return false;
    return hasRoleHierarchy(userRole, requiredRole);
  };

  /**
   * Retorna o nível de hierarquia do usuário (1-5)
   * 5 = SUPER_ADMIN, 4 = PROFESSIONAL_SYNDIC, 3 = ADMIN, 2 = SYNDIC, 1 = RESIDENT
   */
  const hierarchyLevel = userRole ? getRoleHierarchyLevel(userRole) : 0;

  return {
    // Role atual
    userRole,

    // Verificações de role específicas
    isSuperAdmin: isSuperAdmin(userRole),
    isProfessionalSyndic: isProfessionalSyndic(userRole),
    isAdmin: isAdmin(userRole),
    isSyndic: isSyndic(userRole),
    isResident: isResident(userRole),

    // Verificações de nível
    isAdminLevel: isAdminLevel(userRole), // SUPER_ADMIN, PROFESSIONAL_SYNDIC ou ADMIN
    isManagementLevel: isManagementLevel(userRole), // Qualquer role exceto RESIDENT

    // Métodos de verificação
    hasRole, // Verifica role exata
    hasAnyRole, // Verifica se tem uma das roles
    hasHierarchy, // Verifica hierarquia de roles
    hierarchyLevel, // Nível numérico da hierarquia

    // Verificação de permissões
    can, // Verifica permissão específica
    canAny, // Verifica se tem qualquer uma das permissões
    canAll, // Verifica se tem todas as permissões

    // Constantes para uso em comparações
    roles: UserRoles,
  };
};

/**
 * Hook simplificado para verificar se usuário é administrador
 * (SUPER_ADMIN, PROFESSIONAL_SYNDIC ou ADMIN)
 */
export const useIsAdmin = (): boolean => {
  const userRole = useAppSelector(selectUserRole) as
    | UserRole
    | null
    | undefined;
  return isAdminLevel(userRole);
};

/**
 * Hook simplificado para verificar se usuário tem permissão de gestão
 * (Qualquer role exceto RESIDENT)
 */
export const useIsManagement = (): boolean => {
  const userRole = useAppSelector(selectUserRole) as
    | UserRole
    | null
    | undefined;
  return isManagementLevel(userRole);
};

/**
 * Hook para verificar permissão específica
 */
export const usePermission = (permission: string): boolean => {
  const userRole = useAppSelector(selectUserRole) as
    | UserRole
    | null
    | undefined;
  return hasPermission(userRole, permission);
};

/**
 * Hook para verificar múltiplas permissões (OR logic)
 */
export const useAnyPermission = (permissions: string[]): boolean => {
  const userRole = useAppSelector(selectUserRole) as
    | UserRole
    | null
    | undefined;
  return hasAnyPermission(userRole, permissions);
};

/**
 * Hook para verificar múltiplas permissões (AND logic)
 */
export const useAllPermissions = (permissions: string[]): boolean => {
  const userRole = useAppSelector(selectUserRole) as
    | UserRole
    | null
    | undefined;
  return hasAllPermissions(userRole, permissions);
};
