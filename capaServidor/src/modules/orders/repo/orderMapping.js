import { normalizeProcessName } from './orderProductionRules.js';

export function uniqueProductNames(details = []) {
  const names = details
    .map((detail) => detail.Tipo_Producto?.nombre_producto)
    .filter(Boolean);

  return [...new Set(names)].join(", ");
}

export function uniqueProductDescriptions(details = []) {
  const descriptions = details
    .map((detail) => detail.Tipo_Producto?.descripcion_producto)
    .filter(Boolean);

  return [...new Set(descriptions)].join(", ");
}

export function totalQuantity(details = []) {
  const quantities = details
    .map((detail) => Number(detail.cantidad))
    .filter((quantity) => Number.isFinite(quantity));

  if (quantities.length === 0) return null;

  return quantities.reduce((sum, quantity) => sum + quantity, 0);
}

export function mapDetailSubprocesses(detail) {
  const productSubprocesses = detail.Tipo_Producto?.Producto_Subproceso;

  if (!Array.isArray(productSubprocesses) || productSubprocesses.length === 0) {
    return [];
  }

  const sortedSubprocesses = [...productSubprocesses].sort(
    (left, right) => Number(left.orden_flujo ?? 0) - Number(right.orden_flujo ?? 0),
  );
  const currentIndex = sortedSubprocesses.findIndex(
    (item) =>
      Number(item.id_estado_subproceso) === Number(detail.id_estado_subproceso),
  );
  const isFinished = Boolean(detail.fecha_real_termino);

  return sortedSubprocesses.map((item, index) => {
    const name = item.Estado_Subprocesos?.nombre_estado ?? "Subproceso";

    return {
      id: String(item.id_estado_subproceso ?? normalizeProcessName(name)),
      name,
      status:
        isFinished || (currentIndex > -1 && index < currentIndex)
          ? "done"
          : "pending",
      order: item.orden_flujo ?? index + 1,
    };
  });
}

export function mapLanyardProgress(detail) {
  const latest = Array.isArray(detail.Avance_Lanyard) ? detail.Avance_Lanyard[0] : null;
  const quantity = Number(detail.cantidad ?? 0);
  const accumulated = Number(latest?.cantidad_acumulada ?? 0);
  const percentage = Number(latest?.porcentaje_acumulado ?? 0);

  return {
    accumulatedQuantity: accumulated,
    totalQuantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    remainingQuantity: Number.isFinite(quantity) && quantity > 0 ? Math.max(0, quantity - accumulated) : null,
    percentage,
    updatedAt: latest?.fecha_actualizacion ?? latest?.fecha_registro ?? null,
    lastProductionDate: latest?.fecha_produccion ?? null,
  };
}

export function mapOrderDetail(detail) {
  return {
    ...(detail.linea_origen ? {
      linea_origen: detail.linea_origen,
      codigo: detail.codigo_origen ?? null,
      producto: detail.producto_origen ?? null,
      familia: detail.familia_origen ?? null,
      subfamilia: detail.subfamilia_origen ?? null,
    } : {}),
    id_detalle_pedido: detail.id_detalle_pedido ?? null,
    id: detail.id_detalle_pedido ? String(detail.id_detalle_pedido) : null,
    id_tipo_producto: detail.id_tipo_producto ?? null,
    nombre_producto: detail.Tipo_Producto?.nombre_producto ?? null,
    product: detail.Tipo_Producto?.nombre_producto ?? null,
    descripcion_producto: detail.Tipo_Producto?.descripcion_producto ?? null,
    cantidad: detail.cantidad ?? null,
    quantity: detail.cantidad ?? null,
    fecha_estimada_termino: detail.fecha_estimada_termino ?? null,
    dueDate: detail.fecha_estimada_termino ?? null,
    fecha_real_termino: detail.fecha_real_termino ?? null,
    id_estado_subproceso: detail.id_estado_subproceso ?? null,
    estado_subproceso: detail.Estado_Subprocesos?.nombre_estado ?? null,
    lanyardProgress: mapLanyardProgress(detail),
    subProcesses: mapDetailSubprocesses(detail),
  };
}

export function mapUntrackedItem(item) {
  return {
    id_item_sin_seguimiento: item.id_item_sin_seguimiento ?? null,
    codigo: item.codigo ?? null,
    producto: item.producto ?? null,
    cantidad: item.cantidad ?? null,
    subfamilia: item.subfamilia ?? null,
  };
}

export function toOrderSummaryDTO(order, paymentStatusName = null) {
  if (!order) return null;

  const detallePedido = Array.isArray(order.Detalle_pedido) ? order.Detalle_pedido : [];
  const totalProductNames = detallePedido.length > 0 ? uniqueProductNames(detallePedido) : undefined;
  const descripcionProducto = detallePedido.length > 0 ? uniqueProductDescriptions(detallePedido) : undefined;
  const quantityTotal = detallePedido.length > 0 ? totalQuantity(detallePedido) : null;

  return {
    id: order.id_pedido ?? null,
    id_pedido: order.id_pedido ?? null,
    numero_nota_venta: order.numero_nota_venta ?? null,
    fecha_creacion: order.fecha_creacion ?? null,
    fecha_estimada_termino: order.fecha_estimada_termino ?? null,
    dueDate: order.fecha_estimada_termino ?? null,
    nombre_cliente: order.Cliente?.nombre_cliente ?? order.Cliente?.razon_social ?? null,
    nombre_producto: totalProductNames,
    product: totalProductNames,
    descripcion_producto: descripcionProducto,
    cantidad: quantityTotal,
    quantity: quantityTotal,
    detalles: detallePedido.map(mapOrderDetail),
    id_etapa_general: order.Estado_Pedido?.orden_kanban ?? null,
    generalStepId: order.Estado_Pedido?.orden_kanban ?? null,
    nombre_etapa_general: order.Estado_Pedido?.nombre_etapa ?? null,
    id_estado_pago: order.id_estado_pago ?? null,
    paymentStatusId: order.id_estado_pago ?? null,
    id_estado_pedido: order.id_estado_pedido ?? null,
    estado_pago: paymentStatusName ?? order.Estado_Pago?.nombre_estado_pago ?? null,
    paymentStatus: paymentStatusName ?? order.Estado_Pago?.nombre_estado_pago ?? null,
    etiquetas: Array.isArray(order.Pedido_Etiqueta)
      ? order.Pedido_Etiqueta.map((item) => item.etiqueta).filter(Boolean)
      : [],
    itemsSinSeguimientoProductivo: Array.isArray(order.Pedido_Item_Sin_Seguimiento)
      ? order.Pedido_Item_Sin_Seguimiento.map(mapUntrackedItem)
      : [],
  };
}

export function toOrderDetailDTO(order, paymentStatusName = null) {
  if (!order) return null;

  return {
    ...toOrderSummaryDTO(order, paymentStatusName),
  };
}

export function mapOrderRow(order, paymentStatusName = null) {
  return toOrderSummaryDTO(order, paymentStatusName);
}

export function mapPaymentOrderRow(order) {
  if (!order) return null;

  return {
    id_pedido: order.id_pedido,
    numero_nota_venta: order.numero_nota_venta,
    fecha_creacion: order.fecha_creacion,
    id_estado_pago: order.id_estado_pago,
    id_estado_pedido: order.id_estado_pedido,
    nombre_cliente: order.nombre_cliente ?? null,
    razon_social: order.razon_social ?? null,
    rut_cliente: order.rut_cliente ?? null,
    id_etapa_general: order.id_etapa_general ?? null,
    generalStepId: order.id_etapa_general ?? null,
    nombre_etapa_general: order.nombre_etapa_general ?? null,
    estado_pago: order.estado_pago ?? null,
    paymentStatus: order.estado_pago ?? null,
  };
}
