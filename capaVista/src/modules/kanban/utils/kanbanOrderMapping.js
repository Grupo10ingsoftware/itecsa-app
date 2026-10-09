import { toDateKey, getDeliveryDelayStatus, isOrderDelayed, isOrderUrgent } from './kanbanDates.js'
import { isLanyardItem, hasOrderLabel } from './kanbanOrderRules.js'
import { baseColumns } from './kanbanColumns.js'

export function normalizeProcessName(value) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
}

export function createItemFromDetail(detail, index) {
  const product = detail.product ?? 'Producto no definido'
  return {
    id: String(detail.id ?? `${normalizeProcessName(product)}-${index}`),
    product,
    quantity: detail.quantity ?? null,
    dueDate: toDateKey(detail.dueDate),
    manufacturingDetails: detail.manufacturingDetails ?? null,
    lanyardProgress: detail.lanyardProgress ?? null,
    subProcesses: Array.isArray(detail.subProcesses) ? detail.subProcesses : [],
  }
}

export function buildOrderItems(order, product, dueDate) {
  const items = (Array.isArray(order.items) ? order.items : []).map(createItemFromDetail)
  if (!items.length) items.push({
    id: `${order.id}-principal`, product, quantity: null, dueDate,
    manufacturingDetails: null, lanyardProgress: null, subProcesses: [],
  })
  return items.sort((left, right) => Number(isLanyardItem(right)) - Number(isLanyardItem(left)))
}

export function normalizeOrder(order) {
  const dueDate = toDateKey(order.dueDate)
  const product = [...new Set((order.items ?? []).map((item) => item.product).filter(Boolean))].join(', ') || 'Producto no definido'
  const items = buildOrderItems(order, product, dueDate)
  const deliveryDelay = getDeliveryDelayStatus(dueDate)
  return {
    id: order.id,
    clientName: order.clientName || 'Cliente sin nombre',
    seller: order.seller ?? '',
    salesNoteNumber: order.salesNoteNumber,
    product,
    date: order.createdAt ?? '',
    dueDate,
    paymentStatus: order.paymentStatus ?? '',
    paymentStatusId: order.paymentStatusId,
    orderStatus: order.orderStatus,
    generalStepId: order.generalStepId,
    isDelayed: isOrderDelayed(dueDate),
    delayStatus: deliveryDelay.status,
    businessDaysRemaining: deliveryDelay.businessDaysRemaining,
    isUrgent: hasOrderLabel(order, ['Urgencia']) || isOrderUrgent(dueDate),
    hasContractPriority: hasOrderLabel(order, ['Prioridad por contrato', 'Cliente con contrato']),
    isProducing: hasOrderLabel(order, ['PRODUCIÉNDOSE', 'PRODUCIENDOSE']),
    labels: order.labels ?? [],
    items,
    comments: order.comments ?? [],
    commentGroups: order.commentGroups ?? null,
    correctionRequested: Boolean(order.correctionRequested),
    correctionComment: order.correctionComment ?? '',
    correctionRequestedAt: order.correctionRequestedAt ?? null,
    paymentDeconfirmationRequested: Boolean(order.paymentDeconfirmationRequested),
    paymentDeconfirmationRequestedAt: order.paymentDeconfirmationRequestedAt ?? null,
    paymentDeconfirmationRequestedBy: order.paymentDeconfirmationRequestedBy ?? null,
  }
}

export function normalizeStatus(status) {
  const order = Number(status.orden_kanban)
  const column = baseColumns[order] ?? { accent: '#2563eb', icon: 'bi-kanban' }
  return { id: String(status.id_estado_pedido), title: status.nombre_etapa, generalStepId: order, order, accent: column.accent, icon: column.icon }
}
