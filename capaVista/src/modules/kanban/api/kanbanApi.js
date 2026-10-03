import {
  parseKanbanOrderDetailDTO,
  parseKanbanPageDTO,
  parseOrderLabelsPatchDTO,
  parseOrderStagePatchDTO,
} from '../../orders/utils/orderDto'

export function createKanbanApi(apiClient) {
  const queryString = (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
    })
    return query.size ? `?${query.toString()}` : ''
  }
  return {
    getOrders: (params) => apiClient.get(`/orders/kanban-summary${queryString(params)}`).then(parseKanbanPageDTO),
    getOrderDetail: (orderId) => apiClient.get(`/orders/${orderId}/kanban-detail`).then(parseKanbanOrderDetailDTO),
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
      }).then(parseKanbanOrderDetailDTO),
    sendToReview: (orderId, comment) =>
      apiClient.patch(`/orders/${orderId}/review`, { comment }).then(parseKanbanOrderDetailDTO),
    cancelProduction: (orderId, payload = {}) =>
      apiClient.patch(`/orders/${orderId}/cancel-production`, {
        pin: payload.pin,
        comment: payload.comment,
      }),
    rollbackSubprocess: (orderId, detailId, subprocessId, payload = {}) =>
      apiClient.patch(`/orders/${orderId}/details/${detailId}/subprocesses/${subprocessId}/rollback`, payload).then(parseKanbanOrderDetailDTO),
    reevaluate: (orderId) => apiClient.patch(`/orders/${orderId}/reevaluate`, {}).then(parseKanbanOrderDetailDTO),
    setLabel: (orderId, label, active) => apiClient.patch(`/orders/${orderId}/labels`, { label, active }).then(parseOrderLabelsPatchDTO),
    getCapacities: () => apiClient.get('/production-capacity'),
    updateCapacities: (capacities) => apiClient.patch('/production-capacity', { capacities }),
    getProductionLoad: () => apiClient.get('/production-load/today'),
    updateProductionLoad: (entries) => apiClient.patch('/production-load/today', { entries }),
  }
}
