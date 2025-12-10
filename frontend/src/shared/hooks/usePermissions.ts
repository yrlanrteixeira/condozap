/**
 * Custom Hook: usePermissions
 * Verifica permissões do usuário logado
 */

import { useAppSelector } from "./useAppSelector";
import { selectUserRole } from "@/store/slices/authSlice";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@/config/permissions";

/**
 * Hook para verificação de permissões do usuário
 *
 * @example
 * ```tsx
 * const { can, canAny } = usePermissions();
 *
 * if (can(Permissions.EDIT_RESIDENT)) {
 *   return <EditButton />;
 * }
 * ```
 */
export const usePermissions = () => {
  const userRole = useAppSelector(selectUserRole);

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

  return {
    can,
    canAny,
    canAll,
  };
};
