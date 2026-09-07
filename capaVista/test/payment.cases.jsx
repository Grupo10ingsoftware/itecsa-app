import assert from 'node:assert/strict'

import {
  formatPaymentDate,
  getPaymentDateKey,
  isPaymentDateInRange,
} from '../src/modules/payments/utils/paymentDocuments'

export function run() {
  assert.equal(getPaymentDateKey('2026-09-07T00:00:00.000Z'), '2026-09-07')
  assert.equal(formatPaymentDate('2026-09-07T00:00:00.000Z'), '07-09-2026')
  assert.equal(formatPaymentDate('fecha-invalida'), 'Fecha no disponible')
  assert.equal(
    isPaymentDateInRange('2026-09-07T00:00:00.000Z', '2026-09-01', '2026-09-30'),
    true,
  )
  assert.equal(
    isPaymentDateInRange('2026-09-07T00:00:00.000Z', '2026-09-08', ''),
    false,
  )

  console.log('5 verificaciones frontend: formato y rango de fechas de cobranzas OK')
}
