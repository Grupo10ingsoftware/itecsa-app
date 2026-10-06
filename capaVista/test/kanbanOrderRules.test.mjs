import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  hasOrderLabel,
  hasActiveFilters,
  orderMatchesFilters,
} from '../src/modules/kanban/utils/kanbanOrderRules.js'

const order = {
  salesNoteNumber: 'NV-2026-3001',
  clientName: 'Cliente Andes',
  items: [{ product: 'Lanyard' }],
}

test('el filtro de Kanban usa salesNoteNumber de extremo a extremo', () => {
  assert.equal(hasActiveFilters({ salesNoteNumber: '3001' }), true)
  assert.equal(orderMatchesFilters(order, { salesNoteNumber: '3001' }), true)
  assert.equal(orderMatchesFilters(order, { salesNoteNumber: '9999' }), false)
})

test('el nombre legacy nv ya no activa ni altera el filtro', () => {
  assert.equal(hasActiveFilters({ nv: '3001' }), false)
  assert.equal(orderMatchesFilters(order, { nv: '9999' }), false)
})

test('las reglas de Kanban consumen exclusivamente LabelDTO', () => {
  assert.equal(hasOrderLabel({ labels: [{ id: 5, name: 'Urgencia' }] }, ['Urgencia']), true)
  assert.equal(hasOrderLabel({ labels: [{ id_etiqueta: 5, nombre_etiqueta: 'Urgencia' }] }, ['Urgencia']), false)
})
