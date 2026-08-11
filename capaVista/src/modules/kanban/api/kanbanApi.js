export function createKanbanApi(apiClient) {
  return {
    getOrders: () => apiClient.get('/demo-orders'),
    getOrderStatuses: () => apiClient.get('/order-status'),
    moveOrder: (orderId, generalStepId) =>
      apiClient.request(`/demo-orders/${orderId}/move`, {
        method: 'PATCH',
        body: {
          generalStepId,
        },
      }),
  }
}
