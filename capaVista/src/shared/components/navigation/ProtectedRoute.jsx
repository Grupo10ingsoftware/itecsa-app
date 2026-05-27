import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

export default function ProtectedRoute({ children, fallback }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const fromPath = `${location.pathname}${location.search}${location.hash}`

  if (isLoading) {
    return (
      <div className="p-4" role="status">
        Cargando sesion...
      </div>
    )
  }

  if (!isAuthenticated) {
    // Control visual de frontend: la autorizacion definitiva se implementara en backend.
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
