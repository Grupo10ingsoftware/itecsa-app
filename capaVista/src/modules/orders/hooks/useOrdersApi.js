import { useAuth0 } from '@auth0/auth0-react'
import { useMemo } from 'react'
import { createApiClient } from '../../../services/api/apiClient'
import { createOrdersApi } from '../api/ordersApi.js'

export function useOrdersApi() {
  const { getAccessTokenSilently } = useAuth0()

  const getAccessToken = useMemo(
    () => () =>
      getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      }),
    [getAccessTokenSilently],
  )

  return useMemo(() => createOrdersApi(createApiClient({ getAccessToken })), [getAccessToken])
}
