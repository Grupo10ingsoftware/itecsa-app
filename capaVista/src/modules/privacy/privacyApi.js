import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useMemo } from 'react'
import { createApiClient } from '../../services/api/apiClient'

export function usePrivacyApi() {
  const { getAccessTokenSilently } = useAuth0()
  const getAccessToken = useCallback(() => getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } }), [getAccessTokenSilently])
  return useMemo(() => createApiClient({ getAccessToken }), [getAccessToken])
}
export function privacyError(error) {
  return typeof error?.payload?.message === 'string' ? error.payload.message : 'No fue posible completar la operación. Intenta nuevamente.'
}
export function downloadPrivacyResponse(response) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(response, null, 2)], { type: 'application/json;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `respuesta-privacidad-${response.requestId}.json`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
