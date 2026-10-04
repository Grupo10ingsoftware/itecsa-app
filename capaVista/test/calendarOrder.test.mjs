import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getCalendarOrderQuantity,
  getCalendarOrderStatus,
} from '../src/modules/productionCalendar/utils/calendarOrder.js'
import {
  PRODUCTION_STATUSES,
  PRODUCTION_STATUS_BY_STEP,
} from '../src/modules/productionCalendar/config/productionCalendar.config.js'

test('calendario contempla los siete estados vigentes', () => {
  assert.equal(Object.keys(PRODUCTION_STATUS_BY_STEP).length, 7)
  assert.deepEqual(Object.values(PRODUCTION_STATUS_BY_STEP), [
    PRODUCTION_STATUSES.PAYMENT_CONFIRMATION,
    PRODUCTION_STATUSES.READY_PRODUCTION,
    PRODUCTION_STATUSES.IN_PRODUCTION,
    PRODUCTION_STATUSES.READY_DELIVERY,
    PRODUCTION_STATUSES.COMPLETED,
    PRODUCTION_STATUSES.CANCELLED,
    PRODUCTION_STATUSES.IN_REVIEW,
  ])

  for (const [step, status] of Object.entries(PRODUCTION_STATUS_BY_STEP)) {
    assert.equal(getCalendarOrderStatus({ generalStepId: Number(step) }), status)
  }
})

test('calendario prefiere el estado canonico entregado por la API', () => {
  assert.equal(getCalendarOrderStatus({ generalStepId: 0, orderStatus: 'Cancelado' }), 'Cancelado')
})

test('calendario suma las cantidades de todos los items sin inventar cero', () => {
  assert.equal(getCalendarOrderQuantity([{ quantity: 2 }, { quantity: '3' }, { quantity: null }]), 5)
  assert.equal(getCalendarOrderQuantity([{ quantity: null }, { quantity: '' }]), null)
  assert.equal(getCalendarOrderQuantity([]), null)
})
