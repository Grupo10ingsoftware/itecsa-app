export function createKanbanApi(apiClient) {
  return {
    getOrders: () => apiClient.get('/orders'),
    getOrderStatuses: () => apiClient.get('/order-status'),
    moveOrder: (orderId, generalStepId) =>
      apiClient.request(`/orders/${orderId}/move`, {
        method: 'PATCH',
        body: {
          generalStepId,
        },
      }),
  }
}
