import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import type { Role } from '@/types/auth';

export interface RoleGuardProps {
  allowedRoles: Role[];
  children?: React.ReactNode;
  redirectTo?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children, redirectTo }) => {
  const { hasRole } = useAuthStore();

  if (!hasRole(allowedRoles)) {
    const isBusiness = hasRole(['BusinessOwner', 'BusinessManager', 'Employee']);
    const fallback = redirectTo || (isBusiness ? '/admin/dashboard' : '/explore');
    return <Navigate to={fallback} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

