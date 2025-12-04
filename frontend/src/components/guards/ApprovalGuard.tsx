/**
 * Approval Guard
 * 
 * Redireciona usuários com status PENDING para a página de aguardo de aprovação
 * Bloqueia usuários com status REJECTED do acesso ao sistema
 */

import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks';
import { selectUser } from '@/store/slices/authSlice';

interface ApprovalGuardProps {
  children: React.ReactNode;
}

export function ApprovalGuard({ children }: ApprovalGuardProps) {
  const user = useAppSelector(selectUser);

  // No user means not logged in - let ProtectedRoute handle it
  if (!user) {
    return <>{children}</>;
  }

  // Check user status from Redux store (synced from JWT)
  const userStatus = (user as any).status;

  // If user is pending approval, redirect to pending page
  if (userStatus === 'PENDING') {
    return <Navigate to="/pending-approval" replace />;
  }

  // If user is rejected, redirect to login with message
  if (userStatus === 'REJECTED') {
    return <Navigate to="/auth/login?rejected=true" replace />;
  }

  // If user is approved or suspended (handled separately), allow access
  return <>{children}</>;
}


