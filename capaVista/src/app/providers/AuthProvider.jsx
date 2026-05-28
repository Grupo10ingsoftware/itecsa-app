import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { roleHasPermission } from '../../config/permissions'
import { MOCK_USERS } from '../../modules/auth/mocks/authMocks'
import { useAuthApi } from '../../modules/auth/hooks/useAuthApi'
import { API_ERROR_CODES } from '../../services/api/apiClient'
import { AuthContext } from './authContext'

const AUTH_STATUS = Object.freeze({
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  SESSION_INVALID: 'session-invalid',
  ACCESS_DENIED: 'access-denied',
  ERROR: 'error',
})

export function AuthProvider({ children }) {
  const {
    error,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout: auth0Logout,
    user,
  } = useAuth0()
  const authApi = useAuthApi()
  const [verifiedSession, setVerifiedSession] = useState({
    status: null,
    subject: null,
    user: null,
    error: null,
  })

  useEffect(() => {
    let isCurrent = true

    if (isLoading || !isAuthenticated) {
      return () => {
        isCurrent = false
      }
    }

    authApi
      .verify()
      .then((verifiedUser) => {
        if (!isCurrent) {
          return
        }

        setVerifiedSession({
          status: AUTH_STATUS.AUTHENTICATED,
          subject: user?.sub ?? verifiedUser.sub ?? null,
          user: verifiedUser,
          error: null,
        })
      })
      .catch((verifyError) => {
        if (!isCurrent) {
          return
        }

        const status =
          verifyError?.code === API_ERROR_CODES.SESSION_INVALID || verifyError?.status === 401
            ? AUTH_STATUS.SESSION_INVALID
            : verifyError?.status === 403
              ? AUTH_STATUS.ACCESS_DENIED
              : AUTH_STATUS.ERROR

        setVerifiedSession({
          status,
          subject: user?.sub ?? null,
          user: null,
          error: verifyError,
        })
      })

    return () => {
      isCurrent = false
    }
  }, [authApi, isAuthenticated, isLoading, user?.sub])

  const logout = useCallback(() => {
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    })
  }, [auth0Logout])

  const hasCurrentVerification = verifiedSession.subject === (user?.sub ?? null)
  const verifiedUser = isAuthenticated && hasCurrentVerification ? verifiedSession.user : null
  const verificationError =
    isAuthenticated && hasCurrentVerification ? verifiedSession.error : null

  const hasRole = useCallback(
    (role) => {
      return verifiedUser?.rolUsuario === role
    },
    [verifiedUser],
  )

  const hasPermission = useCallback(
    (permission) => {
      // Control visual de experiencia: la autorizacion efectiva siempre la valida el backend.
      const userRole = verifiedUser?.rolUsuario

      return Boolean(userRole && roleHasPermission(userRole, permission))
    },
    [verifiedUser],
  )

  const authStatus = error
    ? AUTH_STATUS.ERROR
    : isLoading
      ? AUTH_STATUS.LOADING
      : !isAuthenticated
        ? AUTH_STATUS.UNAUTHENTICATED
        : hasCurrentVerification && verifiedSession.status
          ? verifiedSession.status
          : AUTH_STATUS.LOADING
  const isVerifyingSession = authStatus === AUTH_STATUS.LOADING
  const sessionError = error ?? verificationError

  const value = useMemo(
    () => ({
      user: verifiedUser,
      auth0User: user,
      isAuthenticated: isAuthenticated && authStatus !== AUTH_STATUS.SESSION_INVALID,
      isLoading: isLoading || isVerifyingSession,
      isVerifyingSession,
      authStatus,
      error: sessionError,
      mockUsers: MOCK_USERS,
      loginWithRedirect,
      logout,
      hasRole,
      hasPermission,
    }),
    [
      verifiedUser,
      user,
      isAuthenticated,
      authStatus,
      isLoading,
      isVerifyingSession,
      sessionError,
      loginWithRedirect,
      logout,
      hasRole,
      hasPermission,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
