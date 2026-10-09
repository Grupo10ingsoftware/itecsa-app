import { runtimeConfig } from '../../../config/runtimeConfig.js'
import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useMemo } from 'react'
import { createApiClient } from '../../../services/api/apiClient'
import { createPaymentsApi } from '../api/paymentsApi'

export function usePaymentsApi() {
  const { getAccessTokenSilently } = useAuth0()

  const getAccessToken = useCallback(
    () =>
      getAccessTokenSilently({
        authorizationParams: {
          audience: runtimeConfig.auth0Audience,
        },
      }),
    [getAccessTokenSilently],
  )

  return useMemo(
    () => createPaymentsApi(createApiClient({ getAccessToken })),
    [getAccessToken],
  )
}
