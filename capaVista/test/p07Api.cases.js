import assert from 'node:assert/strict'
import { createKanbanApi } from '../src/modules/kanban/api/kanbanApi.js'
import { createOrdersCalendarApi, loadCalendarMonth, loadUnscheduledOrders } from '../src/modules/productionCalendar/api/ordersCalendarApi.js'
import { createPaymentsApi } from '../src/modules/payments/api/paymentsApi.js'

export async function run() {
  const urls = []
  const summary = { id: 7, salesNoteNumber: 'NV-7', clientName: 'Cliente', dueDate: null, generalStepId: 1, orderStatus: 'Listo', labels: [], items: [] }
  const client = { patch: async (url, payload) => {
    urls.push(`PATCH ${url}`)
    assert.equal(payload.dueDate, '2026-11-12')
    return { ...summary, dueDate: payload.dueDate, seller: null }
  }, get: async (url) => {
    urls.push(url)
    if (url.endsWith('/kanban-detail')) return { ...summary, createdAt: null, paymentStatusId: 1, paymentStatus: 'Pendiente', comments: [], commentGroups: {} }
    if (url.endsWith('/calendar-detail')) return { ...summary, seller: null }
    if (url.startsWith('/orders/payments')) return { items: [], pageInfo: { hasMore: false, nextCursor: null }, counts: {}, paymentStatuses: [] }
    return { items: [], pageInfo: { hasMore: false, nextCursor: null } }
  } }
  const kanban = createKanbanApi(client)
  const calendar = createOrdersCalendarApi(client)
  const payment = createPaymentsApi(client)
  await kanban.getOrders({ limit: 50, search: 'NV 7' })
  await kanban.getOrderDetail(7)
  await calendar.getOrders({ from: '2026-10-01', to: '2026-10-31' })
  await calendar.getOrders({ unscheduled: true })
  await calendar.getOrderDetail(7)
  const changed = await calendar.updateDeliveryDate(7, '2026-11-12', { pin: '123456' })
  assert.equal(changed.dueDate, '2026-11-12')
  await payment.getPaymentWorkspace({ status: 'Pendiente', cursor: 'signed.cursor' })
  assert.deepEqual(urls, [
    '/orders/kanban-summary?limit=50&search=NV+7',
    '/orders/7/kanban-detail',
    '/orders/calendar-summary?limit=100&from=2026-10-01&to=2026-10-31',
    '/orders/calendar-summary?limit=100&unscheduled=true',
    '/orders/7/calendar-detail',
    'PATCH /orders/7/delivery-date',
    '/orders/payments?status=Pendiente&cursor=signed.cursor',
  ])
  const pages = [
    { items: Array.from({ length: 100 }, (_, id) => ({ id })), pageInfo: { hasMore: true, nextCursor: 'second' } },
    { items: [{ id: 100 }], pageInfo: { hasMore: false, nextCursor: null } },
  ]
  const cursors = []
  const result = await loadCalendarMonth({ getOrders: async ({ cursor }) => { cursors.push(cursor); return pages.shift() } }, { from: '2026-10-01', to: '2026-10-31' })
  assert.equal(result.length, 101)
  assert.deepEqual(cursors, [null, 'second'])
  const pendingCursors = []
  const pendingPages = [
    { items: [{ id: 1 }], pageInfo: { hasMore: true, nextCursor: 'pending-2' } },
    { items: [{ id: 2 }], pageInfo: { hasMore: false, nextCursor: null } },
  ]
  const pending = await loadUnscheduledOrders({ getOrders: async (query) => {
    assert.equal(query.unscheduled, true)
    pendingCursors.push(query.cursor)
    return pendingPages.shift()
  } })
  assert.deepEqual(pending.map((item) => item.id), [1, 2])
  assert.deepEqual(pendingCursors, [null, 'pending-2'])
}
