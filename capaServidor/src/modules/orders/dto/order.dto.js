function assertInternalOrder(record, contractName) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError(`${contractName} requiere un registro interno de pedido.`);
  }

  if (!Object.hasOwn(record, "id_pedido") || record.id_pedido == null) {
    throw new TypeError(`${contractName} requiere el campo interno id_pedido.`);
  }
}

function mapLabel(label) {
  if (!label) return null;

  return {
    id: label.id_etiqueta ?? null,
    name: label.nombre_etiqueta ?? null,
  };
}

function mapUntrackedItem(item) {
  return {
    id: item?.id_item_sin_seguimiento ?? null,
    code: item?.codigo ?? null,
    product: item?.producto ?? null,
    quantity: item?.cantidad ?? null,
    subfamily: item?.subfamilia ?? null,
  };
}

function mapOrderItem(item) {
  const hasSource = [
    item?.linea_origen,
    item?.codigo_origen,
    item?.producto_origen,
    item?.familia_origen,
    item?.subfamilia_origen,
  ].some((value) => value !== null && value !== undefined);

  return {
    id: item?.id_detalle_pedido == null ? null : String(item.id_detalle_pedido),
    productTypeId: item?.id_tipo_producto ?? null,
    product: item?.nombre_producto ?? null,
    productDescription: item?.descripcion_producto ?? null,
    quantity: item?.cantidad ?? null,
    dueDate: item?.fecha_estimada_termino ?? null,
    completedAt: item?.fecha_real_termino ?? null,
    subprocessStateId: item?.id_estado_subproceso ?? null,
    subprocessStatus: item?.estado_subproceso ?? null,
    source: hasSource
      ? {
          lineNumber: item?.linea_origen ?? null,
          code: item?.codigo_origen ?? null,
          product: item?.producto_origen ?? null,
          family: item?.familia_origen ?? null,
          subfamily: item?.subfamilia_origen ?? null,
        }
      : null,
    manufacturingDetails: item?.manufacturingDetails ?? null,
    lanyardProgress: item?.lanyardProgress ?? null,
    subProcesses: Array.isArray(item?.subProcesses) ? item.subProcesses : [],
  };
}

export function toOrderDTO(order) {
  if (!order) return null;
  assertInternalOrder(order, "OrderDTO");

  const dto = {
    id: order.id_pedido,
    salesNoteNumber: order.numero_nota_venta ?? null,
    createdAt: order.fecha_creacion ?? null,
    dueDate: order.fecha_estimada_termino ?? null,
    clientId: order.id_cliente ?? null,
    clientName: order.nombre_cliente ?? null,
    clientRut: order.rut_cliente ?? null,
    clientBusinessName: order.razon_social ?? null,
    responsibleUserId: order.id_usuario ?? null,
    sourceManagerUser: order.usuario_manager_origen ?? null,
    product: order.nombre_producto ?? null,
    productDescription: order.descripcion_producto ?? null,
    quantity: order.cantidad ?? null,
    items: (Array.isArray(order.detalles) ? order.detalles : []).map(mapOrderItem),
    generalStepId: order.id_etapa_general ?? null,
    orderStatusId: order.id_estado_pedido ?? null,
    orderStatus: order.nombre_etapa_general ?? null,
    paymentStatusId: order.id_estado_pago ?? null,
    paymentStatus: order.estado_pago ?? null,
    labels: (Array.isArray(order.etiquetas) ? order.etiquetas : [])
      .map(mapLabel)
      .filter(Boolean),
    untrackedItems: (
      Array.isArray(order.itemsSinSeguimientoProductivo)
        ? order.itemsSinSeguimientoProductivo
        : []
    ).map(mapUntrackedItem),
    comments: Array.isArray(order.comments) ? order.comments : [],
    commentGroups: order.commentGroups ?? {
      all: [],
      source: [],
      subprocesses: [],
      system: [],
    },
  };

  if (Object.hasOwn(order, "observacion_origen")) {
    dto.sourceObservation = order.observacion_origen ?? null;
  }

  if (Object.hasOwn(order, "observacion_interna")) {
    dto.internalObservation = order.observacion_interna ?? null;
  }

  return dto;
}

export function toPaymentOrderDTO(order) {
  if (!order) return null;
  assertInternalOrder(order, "PaymentOrderDTO");

  return {
    id: order.id_pedido,
    salesNoteNumber: order.numero_nota_venta ?? null,
    createdAt: order.fecha_creacion ?? null,
    clientName: order.nombre_cliente ?? null,
    clientBusinessName: order.razon_social ?? null,
    clientRut: order.rut_cliente ?? null,
    generalStepId: order.id_etapa_general ?? null,
    orderStatusId: order.id_estado_pedido ?? null,
    orderStatus: order.nombre_etapa_general ?? null,
    paymentStatusId: order.id_estado_pago ?? null,
    paymentStatus: order.estado_pago ?? null,
  };
}

export function toOrderStagePatchDTO(patch) {
  if (!patch) return null;
  assertInternalOrder(patch, "OrderStagePatchDTO");

  return {
    id: patch.id_pedido,
    orderStatusId: patch.id_estado_pedido ?? null,
    generalStepId: patch.id_etapa_general ?? null,
    orderStatus: patch.nombre_etapa_general ?? null,
  };
}

export function toOrderLabelsPatchDTO(patch) {
  if (!patch) return null;
  assertInternalOrder(patch, "OrderLabelsPatchDTO");

  return {
    id: patch.id_pedido,
    labels: (Array.isArray(patch.etiquetas) ? patch.etiquetas : [])
      .map(mapLabel)
      .filter(Boolean),
  };
}
