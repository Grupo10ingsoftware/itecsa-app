export function createKanbanApi(apiClient) {
  return {
    getOrders: () => apiClient.get('/orders'),
    getOrder: (orderId) => apiClient.get(`/orders/${encodeURIComponent(orderId)}`),
    getOrderStatuses: () => apiClient.get('/order-status'),
    moveOrder: (orderId, generalStepId) =>
      apiClient.request(`/orders/${orderId}/move`, {
        method: 'PATCH',
        body: {
          generalStepId,
        },
      }),
    completeSubprocess: (detailId, subprocessId, payload) =>
      apiClient.post(
        `/order-details/${encodeURIComponent(detailId)}/subprocesses/${encodeURIComponent(subprocessId)}/complete`,
        payload,
      ),
  }
}
