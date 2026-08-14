export function createPaymentsApi(apiClient) {
  return {
    getPaymentOrders: () => apiClient.get('/orders'),
    getPaymentStatuses: () => apiClient.get('/payment-status'),
    updatePaymentStatus: (orderId, payload) =>
      apiClient.patch(`/orders/${orderId}/payment-status`, payload),
  }
}
