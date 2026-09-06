export function applyOrderStagePatch(order, patch) {
  if (!order || Number(order.id) !== Number(patch.id_pedido)) return order

  return {
    ...order,
    id_estado_pedido: patch.id_estado_pedido,
    generalStepId: patch.id_etapa_general,
    orderStatus: patch.nombre_etapa_general,
  }
}
