import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

export default function ProtectedRoute({ children, fallback }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const fromPath = `${location.pathname}${location.search}${location.hash}`

  if (!isAuthenticated) {
    // Control visual de frontend: no reemplaza seguridad real, Auth0 ni autorizacion backend.
    return (
      fallback ?? (
        <Navigate
          replace
          state={{
            fromPath,
          }}
          to={`/login?from=${encodeURIComponent(fromPath)}`}
        />
      )
    )
  }

  return children ?? <Outlet />
}
