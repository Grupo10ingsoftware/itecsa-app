import {
  parseOrderDTO,
  parseOrderLabelsPatchDTO,
  parseOrderListDTO,
  parseOrderStagePatchDTO,
} from '../../orders/utils/orderDto'

export function createKanbanApi(apiClient) {
  return {
    getOrders: () => apiClient.get('/orders').then(parseOrderListDTO),
    getOrderStatuses: () => apiClient.get('/order-status'),
    moveOrder: (orderId, generalStepId, audit = {}) =>
      apiClient.request(`/orders/${orderId}/move`, {
        method: 'PATCH',
        body: {
          generalStepId,
          pin: audit.pin,
          comment: audit.comment,
        },
      }).then(parseOrderStagePatchDTO),
    completeSubprocess: (orderId, detailId, subprocessId, payload = {}) =>
      apiClient.patch(`/orders/${orderId}/details/${detailId}/subprocesses/${subprocessId}/complete`, {
        pin: payload.pin,
        comment: payload.comment,
      }).then(parseOrderDTO),
    sendToReview: (orderId, comment) =>
      apiClient.patch(`/orders/${orderId}/review`, { comment }).then(parseOrderDTO),
    cancelProduction: (orderId, payload = {}) =>
      apiClient.patch(`/orders/${orderId}/cancel-production`, {
        pin: payload.pin,
        comment: payload.comment,
      }).then(parseOrderDTO),
    rollbackSubprocess: (orderId, detailId, subprocessId, payload = {}) =>
      apiClient.patch(`/orders/${orderId}/details/${detailId}/subprocesses/${subprocessId}/rollback`, payload)
        .then(parseOrderDTO),
    reevaluate: (orderId) => apiClient.patch(`/orders/${orderId}/reevaluate`, {}).then(parseOrderDTO),
    setLabel: (orderId, label, active) => apiClient.patch(`/orders/${orderId}/labels`, { label, active })
      .then(parseOrderLabelsPatchDTO),
    getCapacities: () => apiClient.get('/production-capacity'),
    updateCapacities: (capacities) => apiClient.patch('/production-capacity', { capacities }),
    getProductionLoad: () => apiClient.get('/production-load/today'),
    updateProductionLoad: (entries) => apiClient.patch('/production-load/today', { entries }),
  }
}
