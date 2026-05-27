import { Auth0Provider } from '@auth0/auth0-react'
import { AuthProvider } from './AuthProvider'

export default function AppProviders({ children }) {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        redirect_uri: window.location.origin,
      }}
    >
      <AuthProvider>{children}</AuthProvider>
    </Auth0Provider>
  )
}
