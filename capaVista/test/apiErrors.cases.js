import assert from 'node:assert/strict'
import { createApiClient, ApiClientError, API_ERROR_CODES } from '../src/services/api/apiClient'

export async function run() {
  const previous = globalThis.fetch
  const client = createApiClient({ baseUrl: 'https://api.example.invalid/', getAccessToken: async () => 'synthetic-token' })
  const cases = [
    [400, { code: 'VALIDATION_ERROR', message: 'El ID del pedido es obligatorio' }],
    [403, { code: 'FORBIDDEN', message: 'Acceso denegado.' }],
    [404, { code: 'ORDER_NOT_FOUND', message: 'Pedido no encontrado' }],
    [409, { code: 'CONFLICT', message: 'Transicion no permitida.' }],
    [500, { code: 'INTERNAL_ERROR', message: 'Ocurrio un error interno.', requestId: 'synthetic-request-id' }],
    [423, { code: 'PIN_LOCKED', message: 'El PIN esta temporalmente bloqueado.', retryAfterSeconds: 60 }],
  ]
  try {
    for (const [status, payload] of cases) {
      globalThis.fetch = async () => new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })
      await assert.rejects(client.get('/orders/1'), error => {
        assert.ok(error instanceof ApiClientError)
        assert.equal(error.code, API_ERROR_CODES.HTTP_ERROR)
        assert.equal(error.status, status)
        assert.deepEqual(error.payload, payload)
        return true
      })
    }
  } finally { globalThis.fetch = previous }
  console.log('6 verificaciones frontend: errores funcionales, PIN y requestId compatibles OK')
}
