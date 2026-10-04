import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  mergePaymentPreview,
  getPaymentStatusIdByName,
  normalizePaymentOrder,
  normalizePaymentOrders,
} from '../src/modules/payments/utils/paymentOrders.js'

test('cobranzas consume exclusivamente PaymentOrderDTO', () => {
  const normalized = normalizePaymentOrder({
    id: 7,
    salesNoteNumber: 'NV-7',
    createdAt: '2026-10-01T10:00:00.000Z',
    clientName: 'Cliente',
    clientBusinessName: 'Cliente SpA',
    clientRut: '1-9',
    generalStepId: 1,
    orderStatusId: 2,
    orderStatus: 'Listo para produccion',
    paymentStatusId: 2,
    paymentStatus: 'Confirmado',
  })

  assert.deepEqual(normalized, {
    id: 7,
    nvNumber: 'NV-7',
    companyName: 'Cliente SpA',
    rut: '1-9',
    sellerEmail: null,
    trackedProducts: [],
    paymentStatus: 'Confirmado',
    createdAt: '2026-10-01T10:00:00.000Z',
  })
})

test('cobranzas no rescata respuestas legacy mediante aliases', () => {
  assert.deepEqual(normalizePaymentOrders([{
    id_pedido: 7,
    numero_nota_venta: 'NV-7',
    estado_pago: 'Confirmado',
  }]), [])
})

test('cobranzas usa el catalogo canonico de estados de pago', () => {
  assert.equal(getPaymentStatusIdByName([{ id: 2, name: 'Confirmado' }], 'Confirmado'), 2)
  assert.equal(getPaymentStatusIdByName([{ id_estado_pago: 2, nombre_estado_pago: 'Confirmado' }], 'Confirmado'), null)
})

test('el preview de pago conserva su contrato explicito separado', () => {
  const order = normalizePaymentOrder({
    id: 7,
    salesNoteNumber: 'NV-7',
    paymentStatus: 'Pendiente',
  })
  const merged = mergePaymentPreview(order, {
    nvNumber: 'NV-7',
    companyName: 'Cliente SpA',
    rut: '1-9',
    sellerEmail: 'ventas@example.com',
    products: [{
      id: 3,
      productType: 'Lanyard',
      code: 'ABC',
      product: 'Lanyard 20 mm',
      quantity: 100,
    }],
  })

  assert.equal(merged.trackedProducts[0].id, 3)
  assert.equal(merged.trackedProducts[0].quantity, 100)
  assert.equal(merged.sellerEmail, 'ventas@example.com')
})
