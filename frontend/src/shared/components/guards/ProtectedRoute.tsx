import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { isValidUserRole } from '@/config/permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component
 * Redireciona para login se não autenticado
 * Valida perfil de usuário e mostra modal se perfil for inválido
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, userRole, logout } = useAuth();
  const location = useLocation();
  const [showInvalidRoleModal, setShowInvalidRoleModal] = useState(false);

  useEffect(() => {
    // Verificar se o usuário está autenticado mas tem perfil inválido
    if (isAuthenticated && !isValidUserRole(userRole)) {
      setShowInvalidRoleModal(true);
    }
  }, [isAuthenticated, userRole]);

  const handleInvalidRoleClose = () => {
    setShowInvalidRoleModal(false);
    logout();
  };

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se o perfil for inválido, mostrar modal e impedir acesso
  if (!isValidUserRole(userRole)) {
    return (
      <Dialog open={showInvalidRoleModal} onOpenChange={handleInvalidRoleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Acesso Não Permitido</DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <p>
                Seu perfil de usuário não tem permissão para acessar esta aplicação administrativa.
              </p>
              <p className="text-sm">
                Por favor, entre em contato com o administrador do sistema para obter as permissões adequadas.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={handleInvalidRoleClose} variant="default">
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
};


