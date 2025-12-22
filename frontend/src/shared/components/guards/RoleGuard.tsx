import { Navigate, useLocation } from 'react-router-dom';
import { useRole } from '@/shared/hooks/useRole';
import { useAuth } from '@/shared/hooks/useAuth';
import { auditLogger } from '@/lib/audit-logger';
import { useEffect } from 'react';

interface RoleGuardProps {
  children: React.ReactNode;
  role: number;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * RoleGuard component
 * Verifica se o usuário possui um perfil específico
 * Redireciona ou mostra fallback se a verificação falhar
 * Inclui log de auditoria para tentativas de acesso negado
 */
export const RoleGuard = ({
  children,
  role,
  fallback = null,
  redirectTo = '/access-denied',
}: RoleGuardProps) => {
  const { hasRole } = useRole();
  const { user, userRole } = useAuth();
  const location = useLocation();
  const hasRequiredRole = hasRole(role);

  useEffect(() => {
    // Log de auditoria se não tiver a role necessária
    if (!hasRequiredRole) {
      auditLogger.logAccessDeniedInsufficientRole(
        user?.id,
        user?.name,
        userRole,
        role,
        undefined,
        location.pathname
      );
    }
  }, [hasRequiredRole, user, userRole, role, location.pathname]);

  if (!hasRequiredRole) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AnyRoleGuardProps {
  children: React.ReactNode;
  roles: number[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * AnyRoleGuard component
 * Verifica se o usuário possui QUALQUER UM dos perfis especificados
 * Inclui log de auditoria para tentativas de acesso negado
 */
export const AnyRoleGuard = ({
  children,
  roles,
  fallback = null,
  redirectTo = '/access-denied',
}: AnyRoleGuardProps) => {
  const { hasAnyRole } = useRole();
  const { user, userRole } = useAuth();
  const location = useLocation();
  const hasRequiredRoles = hasAnyRole(roles);

  useEffect(() => {
    // Log de auditoria se não tiver nenhuma das roles necessárias
    if (!hasRequiredRoles) {
      auditLogger.logAccessDeniedInsufficientRole(
        user?.id,
        user?.name,
        userRole,
        undefined,
        roles,
        location.pathname
      );
    }
  }, [hasRequiredRoles, user, userRole, roles, location.pathname]);

  if (!hasRequiredRoles) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * AdminGuard component
 * Atalho para verificar se usuário é ADMIN_SYSTEM
 * Inclui log de auditoria para tentativas de acesso negado
 */
export const AdminGuard = ({
  children,
  fallback = null,
  redirectTo = '/access-denied',
}: AdminGuardProps) => {
  const { isAdmin } = useRole();
  const { user, userRole } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Log de auditoria se não for admin
    if (!isAdmin) {
      auditLogger.logAccessDeniedInsufficientRole(
        user?.id,
        user?.name,
        userRole,
        undefined,
        undefined,
        location.pathname
      );
    }
  }, [isAdmin, user, userRole, location.pathname]);

  if (!isAdmin) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};


