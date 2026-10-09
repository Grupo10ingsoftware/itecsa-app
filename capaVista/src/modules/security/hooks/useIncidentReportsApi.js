import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useMemo } from 'react'
import { createApiClient } from '../../../services/api/apiClient'
import { runtimeConfig } from '../../../config/runtimeConfig'
import { createIncidentReportsApi } from '../api/incidentReportsApi'

export function useIncidentReportsApi() {
  const { getAccessTokenSilently } = useAuth0()
  const getAccessToken = useCallback(() => getAccessTokenSilently({ authorizationParams: { audience: runtimeConfig.auth0Audience } }), [getAccessTokenSilently])
  return useMemo(() => createIncidentReportsApi(createApiClient({ getAccessToken })), [getAccessToken])
}
