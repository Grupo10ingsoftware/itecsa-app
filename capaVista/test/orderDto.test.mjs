import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  parseOrderDTO,
  parseOrderLabelsPatchDTO,
  parseOrderListDTO,
  parseOrderStagePatchDTO,
} from '../src/modules/orders/utils/orderDto.js'

function canonicalOrder() {
  return {
    id: 7,
    salesNoteNumber: 'NV-7',
    createdAt: '2026-10-01T10:00:00.000Z',
    dueDate: '2026-10-10T00:00:00.000Z',
    clientId: 2,
    clientName: 'Cliente',
    clientRut: '1-9',
    clientBusinessName: 'Cliente SpA',
    responsibleUserId: 4,
    sourceManagerUser: 'Manager',
    product: 'Lanyard',
    productDescription: 'Lanyard sublimado',
    quantity: 20,
    items: [{
      id: '3',
      productTypeId: 2,
      product: 'Lanyard',
      productDescription: 'Lanyard sublimado',
      quantity: 20,
      dueDate: '2026-10-10T00:00:00.000Z',
      completedAt: null,
      subprocessStateId: null,
      subprocessStatus: null,
      source: null,
      manufacturingDetails: null,
      lanyardProgress: null,
      subProcesses: [],
    }],
    generalStepId: 2,
    orderStatusId: 3,
    orderStatus: 'En produccion',
    paymentStatusId: 2,
    paymentStatus: 'Confirmado',
    labels: [{ id: 5, name: 'Urgencia' }],
    untrackedItems: [],
    comments: [],
    commentGroups: { all: [], source: [], subprocesses: [], system: [] },
  }
}

test('acepta el DTO canonico compartido por Kanban, Calendario y Registro', () => {
  const order = canonicalOrder()

  assert.equal(parseOrderDTO(order), order)
  assert.deepEqual(parseOrderListDTO([order]), [order])
  assert.equal(parseOrderStagePatchDTO({
    id: 7,
    orderStatusId: 4,
    generalStepId: 3,
    orderStatus: 'Listo para entrega',
  }).generalStepId, 3)
  assert.equal(parseOrderLabelsPatchDTO({ id: 7, labels: [] }).id, 7)
})

test('rechaza respuestas legacy en vez de ocultarlas con fallbacks', () => {
  assert.throws(
    () => parseOrderDTO({ id_pedido: 7, numero_nota_venta: 'NV-7', detalles: [] }),
    /no cumple el contrato/,
  )
  assert.throws(
    () => parseOrderStagePatchDTO({ id_pedido: 7, id_etapa_general: 2 }),
    /no cumple el contrato/,
  )
  assert.throws(
    () => parseOrderLabelsPatchDTO({ id_pedido: 7, etiquetas: [] }),
    /no cumple el contrato/,
  )
})
