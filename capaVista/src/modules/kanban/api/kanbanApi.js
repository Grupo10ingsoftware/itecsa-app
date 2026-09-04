export function createKanbanApi(apiClient) {
  return {
    getOrders: () => apiClient.get('/orders'),
    getOrderStatuses: () => apiClient.get('/order-status'),
    moveOrder: (orderId, generalStepId, audit = {}) =>
      apiClient.request(`/orders/${orderId}/move`, {
        method: 'PATCH',
        body: {
          generalStepId,
          pin: audit.pin,
          comment: audit.comment,
        },
      }),
    completeSubprocess: (orderId, detailId, subprocessId, payload = {}) =>
      apiClient.patch(`/orders/${orderId}/details/${detailId}/subprocesses/${subprocessId}/complete`, {
        pin: payload.pin,
        comment: payload.comment,
      }),
    sendToReview: (orderId, comment) =>
      apiClient.patch(`/orders/${orderId}/review`, { comment }),
  }
}
