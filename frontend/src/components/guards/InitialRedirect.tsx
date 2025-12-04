import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks/useAppSelector';
import { selectUserRole } from '@/store/slices/authSlice';
import { UserRoles } from '@/config/permissions';

/**
 * Componente que redireciona para a rota inicial apropriada baseada no perfil do usuário
 * 
 * Lógica de redirecionamento CondoZap:
 * - SUPER_ADMIN → /unified-dashboard (dashboard unificado de todos os condomínios)
 * - PROFESSIONAL_SYNDIC → /unified-dashboard (gerencia múltiplos condomínios)
 * - ADMIN → /dashboard (administrador de condomínio)
 * - SYNDIC → /dashboard (síndico de condomínio)
 * - RESIDENT → /complaints (moradores veem suas próprias denúncias)
 * - Fallback → /dashboard
 */
export const InitialRedirect = () => {
  const userRole = useAppSelector(selectUserRole);

  let redirectTo = '/dashboard'; // Fallback padrão

  // Super Admin e Síndico Profissional → Dashboard Unificado
  if (userRole === UserRoles.SUPER_ADMIN || userRole === UserRoles.PROFESSIONAL_SYNDIC) {
    redirectTo = '/unified-dashboard';
    console.log(`🔄 Redirecionando ${userRole} para /unified-dashboard`);
  } 
  // Admin e Síndico → Dashboard do Condomínio
  else if (userRole === UserRoles.ADMIN || userRole === UserRoles.SYNDIC) {
    redirectTo = '/dashboard';
    console.log(`🔄 Redirecionando ${userRole} para /dashboard`);
  } 
  // Morador → Suas Denúncias
  else if (userRole === UserRoles.RESIDENT) {
    redirectTo = '/complaints';
    console.log('🔄 Redirecionando RESIDENT para /complaints');
  } 
  else {
    console.log('🔄 Redirecionando para /dashboard (fallback)');
  }

  return <Navigate to={redirectTo} replace />;
};

