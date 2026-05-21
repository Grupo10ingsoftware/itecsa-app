import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

export default function ProtectedRoute({ children, fallback }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Control visual de frontend: no reemplaza seguridad real, Auth0 ni autorizacion backend.
    return fallback ?? <Navigate replace state={{ from: location }} to="/login" />
  }

  return children ?? <Outlet />
}
