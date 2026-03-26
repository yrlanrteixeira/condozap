import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/shared/hooks/useAppSelector";
import { selectUserRole } from "@/shared/store/slices/authSlice";
import { UserRoles } from "@/config/permissions";

/**
 * Componente que redireciona para a rota inicial apropriada baseada no perfil do usuário
 *
 * Lógica de redirecionamento TalkZap:
 * - SUPER_ADMIN → /dashboard (todos admins vão para dashboard)
 * - PROFESSIONAL_SYNDIC → /dashboard (gerencia múltiplos condomínios)
 * - ADMIN → /dashboard (administrador de condomínio)
 * - SYNDIC → /dashboard (síndico de condomínio)
 * - RESIDENT → /complaints (moradores veem suas próprias denúncias)
 * - Fallback → /dashboard
 */
export const InitialRedirect = () => {
  const userRole = useAppSelector(selectUserRole);

  let redirectTo = "/dashboard"; // Fallback padrão

  // Morador → Suas Denúncias
  if (userRole === UserRoles.RESIDENT) {
    redirectTo = "/complaints";
  }
  // Todos os outros perfis (ADMIN, SYNDIC, SUPER_ADMIN, PROFESSIONAL_SYNDIC) → Dashboard
  else {
    redirectTo = "/dashboard";
  }

  return <Navigate to={redirectTo} replace />;
};
