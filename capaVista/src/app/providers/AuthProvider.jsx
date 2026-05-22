import { useCallback, useMemo, useState } from 'react'
import { roleHasPermission } from '../../config/permissions'
import { MOCK_USERS } from '../../modules/auth/mocks/authMocks'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  // Sesion simulada/no productiva: vive solo en memoria React y no persiste datos.
  const [user, setUser] = useState(null)

  const loginAsMockUser = useCallback((userId) => {
    // Simula seleccion de usuario para la UI; no valida credenciales ni consulta Auth0/backend.
    const mockUser = MOCK_USERS.find((candidate) => {
      return candidate.idUsuario === userId || candidate.id === userId
    })

    if (!mockUser) {
      throw new Error(`No existe un usuario mock con id "${userId}".`)
    }

    setUser(mockUser)
    return mockUser
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (role) => {
      // rolUsuario viene del MER 06; role queda solo como alias temporal para componentes.
      return (user?.rolUsuario ?? user?.role) === role
    },
    [user],
  )

  const hasPermission = useCallback(
    (permission) => {
      // Control visual de permisos: la autorizacion real debe vivir en backend.
      const userRole = user?.rolUsuario ?? user?.role

      return Boolean(userRole && roleHasPermission(userRole, permission))
    },
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      mockUsers: MOCK_USERS,
      loginAsMockUser,
      logout,
      hasRole,
      hasPermission,
    }),
    [user, loginAsMockUser, logout, hasRole, hasPermission],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
