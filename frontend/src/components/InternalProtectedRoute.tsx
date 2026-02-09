import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface InternalProtectedRouteProps {
  children: ReactNode;
  requireITStaff?: boolean;
}

export default function InternalProtectedRoute({ children, requireITStaff = false }: InternalProtectedRouteProps) {
  const token = localStorage.getItem('internal_token');
  
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requireITStaff) {
    const internalUser = localStorage.getItem('internal_user');
    if (internalUser) {
      try {
        const user = JSON.parse(internalUser);
        if (user.role !== 'it_staff' && user.role !== 'admin') {
          return <Navigate to="/admin/dashboard" replace />;
        }
      } catch (e) {
        return <Navigate to="/admin/login" replace />;
      }
    } else {
      return <Navigate to="/admin/login" replace />;
    }
  }

  return <>{children}</>;
}
