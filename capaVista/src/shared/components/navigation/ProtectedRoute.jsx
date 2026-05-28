import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

export default function ProtectedRoute({ children, fallback }) {
  const { authStatus, error, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const fromPath = `${location.pathname}${location.search}${location.hash}`

  if (isLoading) {
    return (
      <div className="p-4" role="status">
        Cargando sesion...
      </div>
    )
  }

  if (!isAuthenticated || authStatus === 'session-invalid') {
    // Control visual de frontend: la autorizacion definitiva se valida en backend.
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

  if (authStatus === 'error') {
    return (
      <div className="alert alert-danger m-4" role="alert">
        No fue posible verificar la sesion con el backend.
        {error?.message ? ` ${error.message}` : ''}
      </div>
    )
  }

  return children ?? <Outlet />
}
