import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface InternalProtectedRouteProps {
  children: ReactNode;
  requireITStaff?: boolean;
  allowedRoles?: string[];
}

const getDefaultRouteByRole = (role?: string) => {
  if (role === 'manager') return '/gestor/dashboard';
  if (role === 'admin_staff') return '/admin/auxiliar/dashboard';
  return '/admin/dashboard';
};

export default function InternalProtectedRoute({ children, requireITStaff = false, allowedRoles }: InternalProtectedRouteProps) {
  const token = localStorage.getItem('internal_token');
  
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  const internalUser = localStorage.getItem('internal_user');
  if (!internalUser) {
    return <Navigate to="/admin/login" replace />;
  }

  let userRole = '';
  try {
    const user = JSON.parse(internalUser);
    userRole = user?.role || '';
  } catch (e) {
    return <Navigate to="/admin/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={getDefaultRouteByRole(userRole)} replace />;
  }

  if (requireITStaff) {
    if (userRole !== 'it_staff' && userRole !== 'admin') {
      return <Navigate to={getDefaultRouteByRole(userRole)} replace />;
    }
  }

  return <>{children}</>;
}
