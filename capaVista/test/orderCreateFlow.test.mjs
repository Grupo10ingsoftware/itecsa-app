import { buildCreateOrderPayload } from '../src/modules/orders/utils/createOrderPayload.js'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import { canContinueFromSalesNote, validateSalesNoteStep } from '../src/modules/orders/utils/orderCreateValidation.js'
import { normalizeSalesNoteCode } from '../src/modules/orders/utils/orderCreateFormatters.js'

const source = readFileSync(new URL('../src/hooks/useOrderCreateFlow.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/export (const|function)/g, '$1')
const salesNote = (number = 'A') => ({ numeroNota: number, cliente: { nombre: 'Demo', rut: 'DEMO' }, items: [] })
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

// Unitario de handlers reales con scheduler de hooks controlado; no sustituye React DOM.
function mount(api) {
  const slots = [], cleanups = []
  let cursor = 0
  const useState = (initial) => {
    const index = cursor++
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
    return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
  }
  const useRef = (initial) => {
    const index = cursor++
    return slots[index] ??= { current: initial }
  }
  const useEffect = (effect) => {
    const index = cursor++
    if (!(index in slots)) { slots[index] = true; cleanups.push(effect()) }
  }
  const hook = runInNewContext(`${source}\nuseOrderCreateFlow`, {
    useState, useRef, useEffect, useMemo: (fn) => fn(),
    buildCreateOrderPayload, useOrdersApi: () => api, canContinueFromSalesNote, validateSalesNoteStep, normalizeSalesNoteCode,
  })
  return {
    render() { cursor = 0; return hook({ navigate() {} }) },
    unmount() { cleanups.forEach((cleanup) => cleanup?.()) },
  }
}

test('cancelar invalida respuestas y errores tardios', async () => {
  for (const fail of [false, true]) {
    const query = deferred(), app = mount({ getSalesNote: () => query.promise })
    app.render().actions.updateDraftField('salesNoteCode', 'A')
    const pending = app.render().actions.handleSearchSalesNote()
    app.render().actions.resetFlow()
    if (fail) query.reject(new Error('tarde')); else query.resolve(salesNote())
    await pending
    const state = app.render()
    assert.equal(state.draft.salesNoteCode, '')
    assert.equal(state.draft.managerRecord, null)
    assert.equal(state.isSearching, false)
    assert.equal(state.salesNoteIsValid, false)
    assert.equal(Object.keys(state.errors).length, 0)
  }
})

test('editar codigo y buscar otra NV descarta respuesta fuera de orden', async () => {
  const first = deferred(), second = deferred()
  const app = mount({ getSalesNote: (id) => id === 'A' ? first.promise : second.promise })
  app.render().actions.updateDraftField('salesNoteCode', 'A')
  const a = app.render().actions.handleSearchSalesNote()
  app.render().actions.updateDraftField('salesNoteCode', 'B')
  const b = app.render().actions.handleSearchSalesNote()
  second.resolve(salesNote('B')); await b
  first.resolve(salesNote('A')); await a
  assert.equal(app.render().draft.managerRecord.numeroNota, 'B')
})

test('desmontar invalida la consulta pendiente', async () => {
  const query = deferred(), app = mount({ getSalesNote: () => query.promise })
  app.render().actions.updateDraftField('salesNoteCode', 'A')
  const pending = app.render().actions.handleSearchSalesNote()
  app.unmount(); query.resolve(salesNote()); await pending
  assert.equal(app.render().draft.managerRecord, null)
})

test('confirmacion usa contrato minimo e impide doble envio y cierre durante POST', async () => {
  const post = deferred(), calls = []
  const app = mount({ getSalesNote: async () => salesNote(), createOrder: (payload) => { calls.push(payload); return post.promise } })
  app.render().actions.updateDraftField('salesNoteCode', 'A')
  await app.render().actions.handleSearchSalesNote()
  app.render().actions.updateDraftField('comments', ' Observacion ')
  app.render().actions.handleOpenConfirmModal()
  const confirm = app.render().actions.handleConfirmRegister
  const pending = confirm()
  await confirm()
  app.render().actions.closeConfirmModal()
  app.render().actions.resetFlow()
  app.render().actions.updateDraftField('comments', 'alterada')
  assert.equal(calls.length, 1)
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { numeroNota: 'A', priority: null, observacionInterna: 'Observacion' })
  assert.equal(app.render().showConfirmModal, true)
  assert.equal(app.render().isRegistering, true)
  post.resolve({ id_pedido: 1 }); await pending
  assert.equal(app.render().viewMode, 'SUCCESS')
  assert.equal(app.render().showConfirmModal, false)
})

test('cancelar confirmacion impide un handler de confirmacion obsoleto', async () => {
  const app = mount({ getSalesNote: async () => salesNote(), createOrder: () => assert.fail('no debe enviar') })
  app.render().actions.updateDraftField('salesNoteCode', 'A')
  await app.render().actions.handleSearchSalesNote()
  app.render().actions.handleOpenConfirmModal()
  const confirm = app.render().actions.handleConfirmRegister
  app.render().actions.closeConfirmModal()
  await confirm()
})

test('fallo POST libera envio y permite nueva confirmacion', async () => {
  const app = mount({ getSalesNote: async () => salesNote(), createOrder: async () => { throw new Error('Conflicto') } })
  app.render().actions.updateDraftField('salesNoteCode', 'A')
  await app.render().actions.handleSearchSalesNote()
  app.render().actions.handleOpenConfirmModal()
  await app.render().actions.handleConfirmRegister()
  assert.equal(app.render().isRegistering, false)
  assert.equal(app.render().notice.message, 'Conflicto')
  app.render().actions.handleOpenConfirmModal()
  assert.equal(app.render().showConfirmModal, true)
})
