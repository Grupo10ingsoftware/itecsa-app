import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useMemo } from 'react'
import { createApiClient } from '../../../services/api/apiClient'
import { createMetricsApi } from '../api/metricsApi'

export function useMetricsApi() {
  const { getAccessTokenSilently } = useAuth0()
  const getAccessToken = useCallback(
    () => getAccessTokenSilently({
      authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
    }),
    [getAccessTokenSilently],
  )

  return useMemo(
    () => createMetricsApi(createApiClient({ getAccessToken })),
    [getAccessToken],
  )
}