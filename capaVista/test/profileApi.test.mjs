import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAuthApi } from '../src/modules/auth/api/authApi.js'

test('consultas simultáneas de perfil comparten transporte, sin conservar datos completados', async () => {
  let calls = 0, complete
  const api = createAuthApi({ get: () => { calls++; return new Promise(resolve => { complete = resolve }) } })
  const first = api.getProfile(), second = api.getProfile()
  assert.equal(calls, 1); assert.equal(first, second)
  complete({ primerNombre: 'Prueba' }); await first
  const next = api.getProfile(); assert.equal(calls, 2)
  complete({ primerNombre: 'Actualizado' }); assert.equal((await next).primerNombre, 'Actualizado')
})

test('un error permite reintentar y dos instancias de sesión no comparten lecturas', async () => {
  let calls = 0
  const client = { async get() { calls++; if (calls === 1) throw new Error('offline'); return { records: [] } } }
  const api = createAuthApi(client)
  await assert.rejects(api.getProfile(), /offline/)
  await api.getProfile(); assert.equal(calls, 2)
  await Promise.all([createAuthApi(client).getProfile(), createAuthApi(client).getProfile()])
  assert.equal(calls, 4)
})
