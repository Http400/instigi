import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '../hooks';
import { selectIsAuthenticated } from '../features/auth/authSlice';

/**
 * Route guard: renders the nested route when authenticated,
 * otherwise redirects to /auth. The pattern the workout slices reuse.
 */
export default function ProtectedRoute() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return <Outlet />;
}
