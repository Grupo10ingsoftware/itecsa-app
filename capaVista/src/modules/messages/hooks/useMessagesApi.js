import { runtimeConfig } from '../../../config/runtimeConfig.js'
import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useMemo } from 'react'
import { createApiClient } from '../../../services/api/apiClient'
import { createMessagesApi } from '../api/messagesApi'

export function useMessagesApi() {
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
    () => createMessagesApi(createApiClient({ getAccessToken })),
    [getAccessToken],
  )
}
