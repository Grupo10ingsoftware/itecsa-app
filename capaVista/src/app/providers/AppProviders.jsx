import { runtimeConfig } from '../../config/runtimeConfig.js'
import { Auth0Provider } from '@auth0/auth0-react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'

function getSafeReturnPath(returnTo) {
  // Conserva la navegacion interna del callback sin aceptar destinos externos.
  if (typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo
  }

  return '/kanban'
}

export default function AppProviders({ children }) {
  const navigate = useNavigate()
  const handleRedirectCallback = useCallback(
    (appState) => {
      navigate(getSafeReturnPath(appState?.returnTo), { replace: true })
    },
    [navigate],
  )

  return (
    <Auth0Provider
      domain={runtimeConfig.auth0Domain}
      clientId={runtimeConfig.auth0ClientId}
      authorizationParams={{
        // Solicita access tokens destinados a la API ITECSA, no tokens Management.
        audience: runtimeConfig.auth0Audience,
        redirect_uri: window.location.origin,
      }}
      onRedirectCallback={handleRedirectCallback}
    >
      <AuthProvider>{children}</AuthProvider>
    </Auth0Provider>
  )
}
