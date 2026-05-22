import { useContext } from 'react'
import { AuthContext } from '../app/providers/authContext'

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    // Falla temprano para detectar componentes montados fuera del arbol de AppProviders.
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }

  return context
}
