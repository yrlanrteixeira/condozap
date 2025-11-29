import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks/useAppSelector';
import { selectUserRole } from '@/store/slices/authSlice';
import { UserRoles } from '@/config/permissions';

/**
 * Componente que redireciona para a rota inicial apropriada baseada no perfil do usuário
 * 
 * Lógica de redirecionamento:
 * - ADMIN_SYSTEM (id: 2) → /organizations
 * - USER_SYSTEM (id: 4)  → /referrals
 * - Fallback              → /dashboard
 */
export const InitialRedirect = () => {
  const userRole = useAppSelector(selectUserRole);

  let redirectTo = '/dashboard'; // Fallback padrão

  if (userRole === UserRoles.ADMIN_SYSTEM) {
    redirectTo = '/organizations';
    console.log('🔄 Redirecionando ADMIN_SYSTEM para /organizations');
  } else if (userRole === UserRoles.USER_SYSTEM) {
    redirectTo = '/referrals';
    console.log('🔄 Redirecionando USER_SYSTEM para /referrals');
  } else {
    console.log('🔄 Redirecionando para /dashboard (fallback)');
  }

  return <Navigate to={redirectTo} replace />;
};

