import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

export default function RoleGuard({
  requiredPermission,
  requiredRole,
  requiredRoles,
  children,
  fallbackPath = '/access-denied',
}) {
  const { authStatus, hasPermission, hasRole, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const fromPath = `${location.pathname}${location.search}${location.hash}`
  const roles = requiredRoles ?? (requiredRole ? [requiredRole] : [])

  if (isLoading) {
    return (
      <div className="p-4" role="status">
        Verificando permisos...
      </div>
    )
  }

  if (!isAuthenticated || authStatus === 'session-invalid') {
    return (
      <Navigate
        replace
        state={{
          fromPath,
        }}
        to={`/login?from=${encodeURIComponent(fromPath)}`}
      />
    )
  }

  const matchesPermission = !requiredPermission || hasPermission(requiredPermission)
  const matchesRole = roles.length === 0 || roles.some((role) => hasRole(role))

  if (matchesPermission && matchesRole) {
    return children
  }

  // Guard visual: la autorizacion definitiva debe validarse en cada endpoint backend.
  return <Navigate replace to={fallbackPath} />
}
