import { runtimeConfig } from '../../config/runtimeConfig.js'
export const API_ERROR_CODES = {
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SESSION_INVALID: 'SESSION_INVALID',
}

export class ApiClientError extends Error {
  constructor(message, { code, status, payload, cause } = {}) {
    super(message, { cause })
    this.name = 'ApiClientError'
    this.code = code ?? API_ERROR_CODES.HTTP_ERROR
    this.status = status
    this.payload = payload
  }
}

function getDefaultBaseUrl() {
  const baseUrl = runtimeConfig.apiBaseUrl?.trim()

  if (!baseUrl) {
    throw new ApiClientError('VITE_API_BASE_URL no esta configurada.', {
      code: API_ERROR_CODES.CONFIGURATION_ERROR,
    })
  }

  return baseUrl
}

function buildUrl(baseUrl, path) {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedPath = String(path).replace(/^\/+/, '')

  return new URL(normalizedPath, normalizedBaseUrl).toString()
}

async function readResponsePayload(response, responseType) {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (responseType === 'blob' && response.ok) {
    return response.blob()
  }

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text || null
}

function createSessionInvalidError(cause) {
  return new ApiClientError('La sesion no es valida o no esta autenticada.', {
    code: API_ERROR_CODES.SESSION_INVALID,
    status: 401,
    cause,
  })
}

async function getBearerToken(getAccessToken) {
  try {
    const token = await getAccessToken()

    if (typeof token !== 'string' || token.trim().length === 0) {
      throw createSessionInvalidError()
    }

    return token
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error
    }

    throw createSessionInvalidError(error)
  }
}

function isFormDataBody(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

export function createApiClient({ baseUrl = getDefaultBaseUrl(), getAccessToken } = {}) {
  if (typeof getAccessToken !== 'function') {
    throw new ApiClientError('apiClient requiere una funcion getAccessToken.', {
      code: API_ERROR_CODES.CONFIGURATION_ERROR,
    })
  }

  async function request(path, { method = 'GET', headers, body, responseType } = {}) {
    const token = await getBearerToken(getAccessToken)
    const requestHeaders = new Headers(headers)
    requestHeaders.set('Authorization', `Bearer ${token}`)

    const isFormData = isFormDataBody(body)

    if (body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json')
    }

    let response

    try {
      response = await fetch(buildUrl(baseUrl, path), {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      })
    } catch (error) {
      throw new ApiClientError('No fue posible contactar la API.', {
        code: API_ERROR_CODES.NETWORK_ERROR,
        cause: error,
      })
    }

    const payload = await readResponsePayload(response, responseType)

    if (response.status === 401) {
      throw new ApiClientError('La sesion no es valida o no esta autenticada.', {
        code: API_ERROR_CODES.SESSION_INVALID,
        status: response.status,
        payload,
      })
    }

    if (!response.ok) {
      throw new ApiClientError('La API respondio con un error.', {
        code: API_ERROR_CODES.HTTP_ERROR,
        status: response.status,
        payload,
      })
    }

    return payload
  }

  return {
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
    delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
    request,
  }
}
