export function createDemoOrdersApi(apiClient) {
  return {
    getOrders: () => apiClient.get('/demo-orders'),
    updateDeliveryDate: (orderId, dueDate) =>
      apiClient.patch(`/demo-orders/${orderId}/delivery-date`, {
        dueDate,
      }),
  }
}
