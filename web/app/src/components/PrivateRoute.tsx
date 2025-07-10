import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function PrivateRoute({ children, requiredRole }: PrivateRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se requiere un rol específico y el usuario no lo tiene, redirigir al inicio
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // Si todo está bien, renderizar los hijos
  return <>{children}</>;
}
