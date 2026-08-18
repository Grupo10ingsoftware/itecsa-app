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
    assignOrderTag: (orderId, tagId) =>
      apiClient.post(
        `/orders/${encodeURIComponent(orderId)}/tags/${encodeURIComponent(tagId)}`,
      ),
    removeOrderTag: (orderId, tagId) =>
      apiClient.request(
        `/orders/${encodeURIComponent(orderId)}/tags/${encodeURIComponent(tagId)}`,
        { method: 'DELETE' },
      ),
    completeSubprocess: (detailId, subprocessId, payload) =>
      apiClient.post(
        `/order-details/${encodeURIComponent(detailId)}/subprocesses/${encodeURIComponent(subprocessId)}/complete`,
        payload,
      ),
  }
}
