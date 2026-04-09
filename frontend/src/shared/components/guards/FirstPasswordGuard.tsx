import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/shared/hooks";
import { selectUser } from "@/shared/store/slices/authSlice";

interface FirstPasswordGuardProps {
  children: React.ReactNode;
}

/**
 * Enquanto `mustChangePassword` estiver ativo, só permite a rota `/auth/first-access` (além de logout).
 */
export function FirstPasswordGuard({ children }: FirstPasswordGuardProps) {
  const user = useAppSelector(selectUser);
  const { pathname } = useLocation();

  if (!user) {
    return <>{children}</>;
  }

  if (user.mustChangePassword && pathname !== "/auth/first-access") {
    return <Navigate to="/auth/first-access" replace />;
  }

  return <>{children}</>;
}
