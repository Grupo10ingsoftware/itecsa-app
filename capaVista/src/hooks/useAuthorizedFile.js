import { useAuth0 } from '@auth0/auth0-react'
import { useCallback } from 'react'

// Credenciales únicamente para documentos de nuestra API; nunca para URLs externas.
export function useAuthorizedFile() {
  const { getAccessTokenSilently } = useAuth0()
  return useCallback(async (filePath) => {
    const url = new URL(filePath, window.location.href)
    const apiUrl = new URL(import.meta.env.VITE_API_BASE_URL, window.location.href)
    const headers = new Headers()
    if (url.origin === apiUrl.origin && url.pathname.startsWith('/api/documents/nvs/')) {
      const token = await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } })
      headers.set('Authorization', `Bearer ${token}`)
    }
    const response = await fetch(url, { headers })
    if (!response.ok) throw new Error('No fue posible acceder al documento autorizado.')
    return response.blob()
  }, [getAccessTokenSilently])
}
