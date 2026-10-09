import { runtimeConfig } from '../../../config/runtimeConfig.js'
import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useMemo } from 'react'
import { createApiClient } from '../../../services/api/apiClient'
import { createAuthApi } from '../api/authApi'

export function useAuthApi() {
  const { getAccessTokenSilently, user } = useAuth0()

  const getAccessToken = useCallback(
    () =>
      getAccessTokenSilently({
        authorizationParams: {
          audience: runtimeConfig.auth0Audience,
        },
      }),
    [getAccessTokenSilently],
  )

  // An in-flight read must never be reused by another authenticated subject.
  return useMemo(
    () => createAuthApi(createApiClient({ getAccessToken }), { subject: user?.sub }),
    [getAccessToken, user?.sub],
  )
}
