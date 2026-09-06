import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyOrderStagePatch } from '../src/modules/kanban/utils/orderStagePatch.js'

test('cambiar etapa conserva productos, pago, cliente y etiquetas de la tarjeta', () => {
  const order = {
    id: '6', generalStepId: 1, orderStatus: 'Listo para produccion',
    clientName: 'Cliente de prueba', paymentStatus: 'Confirmado',
    items: [{ id: 2, subProcesses: [{ id: 4, status: 'pending' }] }],
    etiquetas: [{ id_etiqueta: 1 }], quantity: 20,
  }
  const result = applyOrderStagePatch(order, {
    id_pedido: 6, id_estado_pedido: 3, id_etapa_general: 2,
    nombre_etapa_general: 'En producción',
  })
  assert.deepEqual(result, {
    ...order, id_estado_pedido: 3, generalStepId: 2, orderStatus: 'En producción',
  })
  assert.equal(order.generalStepId, 1)
  assert.equal(result.items, order.items)
})

test('no modifica otra tarjeta ni un detalle cerrado', () => {
  const order = { id: 7 }
  assert.equal(applyOrderStagePatch(order, { id_pedido: 6 }), order)
  assert.equal(applyOrderStagePatch(null, { id_pedido: 6 }), null)
})
