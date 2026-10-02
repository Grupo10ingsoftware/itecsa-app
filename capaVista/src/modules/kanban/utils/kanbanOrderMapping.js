import { toDateKey, getDeliveryDelayStatus, isOrderDelayed, isOrderUrgent } from './kanbanDates.js';
import { isLanyardItem, hasOrderLabel } from './kanbanOrderRules.js';
import { getColumnTitleByStepId, baseColumns } from './kanbanColumns.js';

export function createItemFromDetail(detail, index) {
  const product = detail.nombre_producto ?? detail.product ?? 'Producto no definido'

  return {
    id: String(detail.id_detalle_pedido ?? `${normalizeProcessName(product)}-${index}`),
    product,
    quantity: detail.cantidad ?? detail.quantity ?? null,
    dueDate: toDateKey(detail.fecha_estimada_termino ?? detail.dueDate),
    manufacturingDetails: detail.manufacturingDetails ?? null,
    lanyardProgress: detail.lanyardProgress ?? null,
    subProcesses: Array.isArray(detail.subProcesses)
      ? detail.subProcesses
      : Array.isArray(detail.subprocesos)
        ? detail.subprocesos
        : [],
  }
}

export function normalizeProcessName(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
}

export function buildOrderItems(order, product, dueDate) {
  const sourceItems = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : Array.isArray(order.detalles) && order.detalles.length > 0
      ? order.detalles
      : []

  const items = sourceItems.map(createItemFromDetail)

  if (items.length === 0) {
    items.push({
      id: `${order.id ?? order.id_pedido}-principal`,
      product,
      quantity: order.quantity ?? order.cantidad ?? null,
      dueDate,
      manufacturingDetails: order.manufacturingDetails ?? null,
      lanyardProgress: order.lanyardProgress ?? null,
      subProcesses: Array.isArray(order.subProcesses)
        ? order.subProcesses
        : Array.isArray(order.subprocesos)
          ? order.subprocesos
          : [],
    })
  }

  return items.sort((left, right) => {
    const leftPriority = isLanyardItem(left) ? 0 : 1
    const rightPriority = isLanyardItem(right) ? 0 : 1

    return leftPriority - rightPriority
  })
}

export function normalizeOrder(order) {
  const id = order.id ?? order.id_pedido
  const product = order.product ?? order.producto ?? order.nombre_producto ?? 'Producto no definido'
  const dueDate =
    toDateKey(
      order.dueDate ??
      order.fecha_estimada_termino ??
      order.fecha_entrega ??
      order.fecha_compromiso,
    )

  const items = buildOrderItems(order, product, dueDate)
  const deliveryDelay = getDeliveryDelayStatus(dueDate)

  return {
    id,
    clientName: order.clientName ?? order.cliente ?? order.nombre_cliente ?? 'Cliente sin nombre',
    seller: order.seller ?? order.vendedorResponsable ?? order.vendedor_responsable ?? order.usuario_manager_origen ?? '',
    nv: order.nv ?? order.numero_nota_venta ?? order.codigo_nota_venta ?? order.codigo_nv ?? `PED-${id}`,
    product,
    date: order.date ?? order.fecha ?? order.fecha_pedido ?? '',
    dueDate,
    paymentStatus: order.paymentStatus ?? order.estado_pago ?? '',
    paymentStatusId: order.paymentStatusId ?? order.id_estado_pago,
    orderStatus:
      order.orderStatus ??
      order.etapa_general ??
      order.nombre_etapa_general ??
      getColumnTitleByStepId(order.id_etapa_general),
    generalStepId: order.generalStepId ?? order.id_etapa_general,
    isDelayed: Boolean(order.isDelayed ?? order.atrasado ?? isOrderDelayed(dueDate)),
    delayStatus: order.delayStatus ?? deliveryDelay.status,
    businessDaysRemaining: order.businessDaysRemaining ?? deliveryDelay.businessDaysRemaining,
    isUrgent: Boolean(order.isUrgent ?? order.urgente ?? (hasOrderLabel(order, ['Urgencia']) || isOrderUrgent(dueDate))),
    hasContractPriority: Boolean(
      order.hasContractPriority ??
      order.prioridad_contrato ??
      hasOrderLabel(order, ['Prioridad por contrato', 'Cliente con contrato']),
    ),
    isProducing: Boolean(order.isProducing ?? hasOrderLabel(order, ['PRODUCIÉNDOSE', 'PRODUCIENDOSE'])),
    etiquetas: order.etiquetas ?? [],
    quantity: order.quantity ?? order.cantidad ?? null,
    items,
    subProcesses: Array.isArray(order.subProcesses)
      ? order.subProcesses
      : Array.isArray(order.subprocesos)
        ? order.subprocesos
        : [],
    comments: Array.isArray(order.comments)
      ? order.comments
      : Array.isArray(order.comentarios)
        ? order.comentarios
        : [],
    commentGroups: order.commentGroups ?? null,
    correctionRequested: Boolean(order.correctionRequested),
    correctionComment: order.correctionComment ?? '',
    correctionRequestedAt: order.correctionRequestedAt ?? null,
    paymentDeconfirmationRequested: Boolean(order.paymentDeconfirmationRequested),
    paymentDeconfirmationRequestedAt: order.paymentDeconfirmationRequestedAt ?? null,
    paymentDeconfirmationRequestedBy: order.paymentDeconfirmationRequestedBy ?? null,
    manufacturingDetails: order.manufacturingDetails ?? null,
  }
}

export function normalizeStatus(status) {
  const order = Number(status.orden_kanban)
  const column = baseColumns[order] ?? { accent: '#2563eb', icon: 'bi-kanban' }

  return {
    id: String(status.id_estado_pedido),
    title: status.nombre_etapa,
    generalStepId: order,
    order,
    accent: column.accent,
    icon: column.icon,
  }
}
