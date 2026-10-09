import { runtimeConfig } from '../../../config/runtimeConfig.js'
import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useMemo } from 'react'
import { createApiClient } from '../../../services/api/apiClient'
import { createOrdersCalendarApi } from '../api/ordersCalendarApi'

export function useOrdersCalendarApi() {
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

  return useMemo(() => createOrdersCalendarApi(createApiClient({ getAccessToken })), [getAccessToken])
}
