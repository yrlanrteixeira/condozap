import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/shared/hooks/useAppSelector";
import { selectUserRole } from "@/shared/store/slices/authSlice";
import { UserRoles } from "@/config/permissions";

/**
 * Componente que redireciona para a rota inicial apropriada baseada no perfil do usuário
 *
 * Lógica de redirecionamento TalkZap:
 * - SUPER_ADMIN → /platform (painel da plataforma)
 * - PROFESSIONAL_SYNDIC → /dashboard (gerencia múltiplos condomínios)
 * - ADMIN → /dashboard (administrador de condomínio)
 * - SYNDIC → /dashboard (síndico de condomínio)
 * - RESIDENT → /complaints (moradores veem suas próprias denúncias)
 * - Fallback → /dashboard
 */
export const InitialRedirect = () => {
  const userRole = useAppSelector(selectUserRole);

  let redirectTo = "/dashboard"; // Fallback padrão

  if (userRole === UserRoles.SUPER_ADMIN) {
    redirectTo = "/platform";
  } else if (userRole === UserRoles.RESIDENT) {
    redirectTo = "/complaints";
  }

  return <Navigate to={redirectTo} replace />;
};
