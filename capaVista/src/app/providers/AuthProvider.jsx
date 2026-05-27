import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useMemo } from 'react'
import { roleHasPermission } from '../../config/permissions'
import { MOCK_USERS } from '../../modules/auth/mocks/authMocks'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const {
    error,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout: auth0Logout,
    user,
  } = useAuth0()

  const logout = useCallback(() => {
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    })
  }, [auth0Logout])

  const hasRole = useCallback(
    (role) => {
      // La lectura de roles Auth0 se incorporara cuando se implemente el paso de guards.
      return (user?.rolUsuario ?? user?.role) === role
    },
    [user],
  )

  const hasPermission = useCallback(
    (permission) => {
      // Control visual pendiente de integrar con claims Auth0; no reemplaza autorizacion backend.
      const userRole = user?.rolUsuario ?? user?.role

      return Boolean(userRole && roleHasPermission(userRole, permission))
    },
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      error,
      mockUsers: MOCK_USERS,
      loginWithRedirect,
      logout,
      hasRole,
      hasPermission,
    }),
    [user, isAuthenticated, isLoading, error, loginWithRedirect, logout, hasRole, hasPermission],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
