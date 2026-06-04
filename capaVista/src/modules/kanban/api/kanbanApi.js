export function createKanbanApi(apiClient) {
  return {
    getOrders: () => apiClient.get('/orders'),
    moveOrder: (orderId, generalStepId) =>
      apiClient.request(`/orders/${orderId}/move`, {
        method: 'PATCH',
        body: {
          generalStepId,
        },
      }),
  }
}
