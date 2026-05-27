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
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        // Solicita access tokens destinados a la API ITECSA, no tokens Management.
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        redirect_uri: window.location.origin,
      }}
      onRedirectCallback={handleRedirectCallback}
    >
      <AuthProvider>{children}</AuthProvider>
    </Auth0Provider>
  )
}
