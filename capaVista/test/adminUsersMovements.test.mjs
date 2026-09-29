import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAdminUsersApi } from '../src/modules/users/api/adminUsersApi.js'

test('concurrent explicit reads share a request; pages and users remain isolated', async () => {
  const calls = []
  const api = createAdminUsersApi({ get: async (path) => {
    calls.push(path)
    return { records: [], total: 0 }
  } })
  await Promise.all([api.getMovements('auth0|one'), api.getMovements('auth0|one')])
  await api.getMovements('auth0|one')
  assert.equal(calls.length, 2)
  await api.getMovements('auth0|one', { page: 2 })
  await api.getMovements('auth0|two')
  assert.equal(calls.length, 4)
  assert.match(calls[0], /auth0%7Cone\/movements/)
})

test('completed results are not retained and failures can be retried', async () => {
  let calls = 0
  let fail = false
  const api = createAdminUsersApi({ get: async () => {
    calls++
    if (fail) throw new Error('offline')
    return { records: [] }
  } })
  await api.getMovements('one')
  fail = true
  await assert.rejects(api.getMovements('one'), /offline/)
  fail = false
  await api.getMovements('one')
  assert.equal(calls, 3)
})

test('in-flight state is scoped to each API instance', async () => {
  let calls = 0
  const client = { get: async () => { calls++; return { records: [] } } }
  await createAdminUsersApi(client).getMovements('one')
  await createAdminUsersApi(client).getMovements('one')
  assert.equal(calls, 2)
})
