import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { auditLogger } from '@/lib/audit-logger';
import { useEffect } from 'react';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * PermissionGuard component
 * Verifica se o usuário possui uma permissão específica
 * Redireciona ou mostra fallback se a permissão for negada
 * Inclui log de auditoria para tentativas de acesso negado
 */
export const PermissionGuard = ({
  children,
  permission,
  fallback = null,
  redirectTo = '/access-denied',
}: PermissionGuardProps) => {
  const { can } = usePermissions();
  const { user, userRole } = useAuth();
  const location = useLocation();
  const hasPermission = can(permission);

  useEffect(() => {
    // Log de auditoria se não tiver a permissão necessária
    if (!hasPermission) {
      auditLogger.logAccessDeniedInsufficientPermission(
        user?.id,
        user?.name,
        userRole,
        permission,
        undefined,
        location.pathname
      );
    }
  }, [hasPermission, user, userRole, permission, location.pathname]);

  if (!hasPermission) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AnyPermissionGuardProps {
  children: React.ReactNode;
  permissions: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * AnyPermissionGuard component
 * Verifica se o usuário possui QUALQUER UMA das permissões especificadas
 * Inclui log de auditoria para tentativas de acesso negado
 */
export const AnyPermissionGuard = ({
  children,
  permissions,
  fallback = null,
  redirectTo = '/access-denied',
}: AnyPermissionGuardProps) => {
  const { canAny } = usePermissions();
  const { user, userRole } = useAuth();
  const location = useLocation();
  const hasAnyPermission = canAny(permissions);

  useEffect(() => {
    // Log de auditoria se não tiver nenhuma das permissões necessárias
    if (!hasAnyPermission) {
      auditLogger.logAccessDeniedInsufficientPermission(
        user?.id,
        user?.name,
        userRole,
        undefined,
        permissions,
        location.pathname
      );
    }
  }, [hasAnyPermission, user, userRole, permissions, location.pathname]);

  if (!hasAnyPermission) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AllPermissionsGuardProps {
  children: React.ReactNode;
  permissions: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * AllPermissionsGuard component
 * Verifica se o usuário possui TODAS as permissões especificadas
 * Inclui log de auditoria para tentativas de acesso negado
 */
export const AllPermissionsGuard = ({
  children,
  permissions,
  fallback = null,
  redirectTo = '/access-denied',
}: AllPermissionsGuardProps) => {
  const { canAll } = usePermissions();
  const { user, userRole } = useAuth();
  const location = useLocation();
  const hasAllPermissions = canAll(permissions);

  useEffect(() => {
    // Log de auditoria se não tiver todas as permissões necessárias
    if (!hasAllPermissions) {
      auditLogger.logAccessDeniedInsufficientPermission(
        user?.id,
        user?.name,
        userRole,
        undefined,
        permissions,
        location.pathname
      );
    }
  }, [hasAllPermissions, user, userRole, permissions, location.pathname]);

  if (!hasAllPermissions) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};


