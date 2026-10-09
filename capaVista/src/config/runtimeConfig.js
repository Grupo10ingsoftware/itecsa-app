export function resolveRuntimeConfig(runtime = {}, vite = {}) {
  const config = {
    auth0Domain: runtime.auth0Domain ?? vite.VITE_AUTH0_DOMAIN,
    auth0ClientId: runtime.auth0ClientId ?? vite.VITE_AUTH0_CLIENT_ID,
    auth0Audience: runtime.auth0Audience ?? vite.VITE_AUTH0_AUDIENCE,
    apiBaseUrl: runtime.apiBaseUrl ?? vite.VITE_API_BASE_URL,
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : '']),
  ))
}

export const runtimeConfig = resolveRuntimeConfig(
  typeof window === 'undefined' ? {} : window.__ITECSA_CONFIG__,
  import.meta.env ?? {},
)
