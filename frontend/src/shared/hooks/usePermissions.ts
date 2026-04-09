/**
 * Custom Hook: usePermissions
 * Verifica permissões do usuário logado
 */

import { useMemo } from "react";
import { useAppSelector } from "./useAppSelector";
import { selectUser, selectUserRole } from "@/shared/store/slices/authSlice";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@/config/permissions";

/**
 * Hook para verificação de permissões do usuário
 *
 * Quando `/auth/me` envia `effectivePermissions` para o condomínio ativo,
 * essa lista (teto do papel ∩ permissões modulares) é a fonte de verdade.
 */
export const usePermissions = () => {
  const userRole = useAppSelector(selectUserRole);
  const user = useAppSelector(selectUser);
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);

  const effectiveForActiveCondo = useMemo(() => {
    if (!user?.condominiums?.length || !currentCondominiumId) {
      return undefined;
    }
    const row = user.condominiums.find((c) => c.id === currentCondominiumId);
    return row?.effectivePermissions;
  }, [user?.condominiums, currentCondominiumId]);

  const can = (permission: string): boolean => {
    if (effectiveForActiveCondo !== undefined) {
      return effectiveForActiveCondo.includes(permission);
    }
    return hasPermission(userRole, permission);
  };

  const canAny = (permissions: string[]): boolean => {
    if (effectiveForActiveCondo !== undefined) {
      return permissions.some((p) => effectiveForActiveCondo.includes(p));
    }
    return hasAnyPermission(userRole, permissions);
  };

  const canAll = (permissions: string[]): boolean => {
    if (effectiveForActiveCondo !== undefined) {
      return permissions.every((p) => effectiveForActiveCondo.includes(p));
    }
    return hasAllPermissions(userRole, permissions);
  };

  return {
    can,
    canAny,
    canAll,
  };
};
