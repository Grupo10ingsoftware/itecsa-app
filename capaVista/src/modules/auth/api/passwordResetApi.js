import { runtimeConfig } from '../../../config/runtimeConfig.js'
export class PasswordResetApiError extends Error {
  constructor(message, { status, payload, cause } = {}) {
    super(message, { cause })
    this.name = 'PasswordResetApiError'
    this.status = status
    this.payload = payload
  }
}

function getBaseUrl() {
  const baseUrl = runtimeConfig.apiBaseUrl?.trim()

  if (!baseUrl) {
    throw new PasswordResetApiError('VITE_API_BASE_URL no esta configurada.')
  }

  return baseUrl
}

function buildUrl(path) {
  const baseUrl = getBaseUrl()
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedPath = String(path).replace(/^\/+/, '')

  return new URL(normalizedPath, normalizedBaseUrl).toString()
}

async function readPayload(response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text ? { message: text } : null
}

export async function requestPasswordResetEmail({ email }) {
  let response

  try {
    response = await fetch(buildUrl('/auth/password-reset/request'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
  } catch (error) {
    throw new PasswordResetApiError('No fue posible contactar la API.', {
      cause: error,
    })
  }

  const payload = await readPayload(response)

  if (!response.ok) {
    throw new PasswordResetApiError('La API respondio con un error.', {
      status: response.status,
      payload,
    })
  }

  return payload
}
