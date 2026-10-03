import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  parseCalendarPageDTO, parseKanbanOrderDetailDTO, parseKanbanPageDTO,
  parseOrderCreatedDTO, parseOrderLabelsPatchDTO, parseOrderStagePatchDTO, parsePaymentWorkspaceDTO,
} from '../src/modules/orders/utils/orderDto.js'

const summary = { id: 7, salesNoteNumber: 'NV-7', clientName: 'Cliente', dueDate: null, generalStepId: 2, orderStatus: 'En produccion', labels: [], items: [] }
const pageInfo = { nextCursor: null, hasMore: false }

test('valida contratos canónicos independientes por módulo', () => {
  assert.equal(parseKanbanPageDTO({ items: [{ ...summary, createdAt: null, paymentStatusId: 2, paymentStatus: 'Confirmado' }], pageInfo }).items[0].id, 7)
  assert.equal(parseCalendarPageDTO({ items: [summary], pageInfo }).items[0].salesNoteNumber, 'NV-7')
  assert.equal(parseKanbanOrderDetailDTO({ ...summary, createdAt: null, paymentStatusId: 2, paymentStatus: 'Confirmado', comments: [], commentGroups: {} }).id, 7)
  assert.equal(parsePaymentWorkspaceDTO({ items: [{ id: 7, salesNoteNumber: 'NV-7', createdAt: null, clientName: 'Cliente', clientBusinessName: null, clientRut: null, paymentStatusId: 1, paymentStatus: 'Pendiente' }], pageInfo, counts: {}, paymentStatuses: [] }).items.length, 1)
});

test('valida respuestas breves y rechaza aliases legacy', () => {
  assert.deepEqual(parseOrderCreatedDTO({ id: 7, salesNoteNumber: 'NV-7' }), { id: 7, salesNoteNumber: 'NV-7' })
  assert.equal(parseOrderStagePatchDTO({ id: 7, orderStatusId: 2, generalStepId: 1, orderStatus: 'Listo' }).id, 7)
  assert.equal(parseOrderLabelsPatchDTO({ id: 7, labels: [] }).id, 7)
  assert.throws(() => parseKanbanPageDTO({ items: [{ id_pedido: 7 }], pageInfo }), /no cumple el contrato/)
});
