export function applyOrderStagePatch(order, patch) {
  if (!order || Number(order.id) !== Number(patch.id)) return order

  return {
    ...order,
    orderStatusId: patch.orderStatusId,
    generalStepId: patch.generalStepId,
    orderStatus: patch.orderStatus,
  }
}
