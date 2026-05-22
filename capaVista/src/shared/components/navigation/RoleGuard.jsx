import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

export default function RoleGuard({
  requiredPermission,
  requiredRole,
  requiredRoles,
  children,
  fallbackPath = '/access-denied',
}) {
  const { hasPermission, hasRole } = useAuth()
  const roles = requiredRoles ?? (requiredRole ? [requiredRole] : [])

  const matchesPermission = !requiredPermission || hasPermission(requiredPermission)
  const matchesRole = roles.length === 0 || roles.some((role) => hasRole(role))

  if (matchesPermission && matchesRole) {
    return children
  }

  // Guard visual: la autorizacion definitiva debe validarse en backend en la integracion futura.
  return <Navigate replace to={fallbackPath} />
}
