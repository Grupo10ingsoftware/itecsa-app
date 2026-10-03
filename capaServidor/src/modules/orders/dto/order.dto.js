function assertInternalOrder(record, contractName) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError(`${contractName} requiere un registro interno de pedido.`);
  }
  if (!Object.hasOwn(record, "id_pedido") || record.id_pedido == null) {
    throw new TypeError(`${contractName} requiere el campo interno id_pedido.`);
  }
}

const labels = (order) => (Array.isArray(order.etiquetas) ? order.etiquetas : [])
  .map((label) => label && ({ id: label.id_etiqueta ?? null, name: label.nombre_etiqueta ?? null }))
  .filter(Boolean);

const items = (order) => (Array.isArray(order.detalles) ? order.detalles : []).map((item) => ({
  id: item?.id_detalle_pedido == null ? null : String(item.id_detalle_pedido),
  product: item?.nombre_producto ?? item?.product ?? null,
  quantity: item?.cantidad ?? item?.quantity ?? null,
  dueDate: item?.fecha_estimada_termino ?? item?.dueDate ?? null,
  manufacturingDetails: item?.manufacturingDetails ?? null,
  lanyardProgress: item?.lanyardProgress ?? null,
  subProcesses: Array.isArray(item?.subProcesses) ? item.subProcesses : [],
}));

function baseSummary(order) {
  assertInternalOrder(order, "OrderSummaryDTO");
  return {
    id: order.id_pedido,
    salesNoteNumber: order.numero_nota_venta ?? null,
    clientName: order.nombre_cliente ?? null,
    dueDate: order.fecha_estimada_termino ?? null,
    generalStepId: order.id_etapa_general ?? null,
    orderStatus: order.nombre_etapa_general ?? null,
    labels: labels(order),
    items: items(order),
  };
}

export function toKanbanOrderSummaryDTO(order) {
  return {
    ...baseSummary(order),
    createdAt: order.fecha_creacion ?? null,
    paymentStatusId: order.id_estado_pago ?? null,
    paymentStatus: order.estado_pago ?? null,
  };
}

export function toKanbanOrderDetailDTO(order) {
  return {
    ...toKanbanOrderSummaryDTO(order),
    comments: Array.isArray(order.comments) ? order.comments : [],
    commentGroups: order.commentGroups ?? { all: [], source: [], subprocesses: [], system: [] },
  };
}

export function toCalendarOrderSummaryDTO(order) {
  return baseSummary(order);
}

export function toCalendarOrderDetailDTO(order) {
  return { ...toCalendarOrderSummaryDTO(order), seller: order.seller ?? null };
}

export function toPaymentOrderDTO(order) {
  assertInternalOrder(order, "PaymentOrderDTO");
  return {
    id: order.id_pedido,
    salesNoteNumber: order.numero_nota_venta ?? null,
    createdAt: order.fecha_creacion ?? null,
    clientName: order.nombre_cliente ?? null,
    clientBusinessName: order.razon_social ?? null,
    clientRut: order.rut_cliente ?? null,
    paymentStatusId: order.id_estado_pago ?? null,
    paymentStatus: order.estado_pago ?? null,
  };
}

export function toOrderCreatedDTO(order) {
  assertInternalOrder(order, "OrderCreatedDTO");
  return { id: order.id_pedido, salesNoteNumber: order.numero_nota_venta ?? null };
}

export function toOrderStagePatchDTO(patch) {
  assertInternalOrder(patch, "OrderStagePatchDTO");
  return {
    id: patch.id_pedido,
    orderStatusId: patch.id_estado_pedido ?? null,
    generalStepId: patch.id_etapa_general ?? null,
    orderStatus: patch.nombre_etapa_general ?? null,
  };
}

export function toOrderLabelsPatchDTO(patch) {
  assertInternalOrder(patch, "OrderLabelsPatchDTO");
  return { id: patch.id_pedido, labels: labels(patch) };
}

export const toOrderDTO = toKanbanOrderDetailDTO;
