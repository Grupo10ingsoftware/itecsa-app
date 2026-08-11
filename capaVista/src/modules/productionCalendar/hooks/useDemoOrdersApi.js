import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useMemo } from 'react'
import { createApiClient } from '../../../services/api/apiClient'
import { createDemoOrdersApi } from '../api/demoOrdersApi'

export function useDemoOrdersApi() {
  const { getAccessTokenSilently } = useAuth0()

  const getAccessToken = useCallback(
    () =>
      getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      }),
    [getAccessTokenSilently],
  )

  return useMemo(() => createDemoOrdersApi(createApiClient({ getAccessToken })), [getAccessToken])
}
