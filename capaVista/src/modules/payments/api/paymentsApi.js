export function createPaymentsApi(apiClient) {
  return {
    getPaymentOrders: () => apiClient.get('/orders'),
    getPaymentStatuses: () => apiClient.get('/payment-status'),
    getPaymentPreview: (orderId) =>
      apiClient.get(`/orders/${orderId}/payment-records/preview`),
    updatePaymentStatus: (orderId, payload) =>
      apiClient.patch(`/orders/${orderId}/payment-status`, payload),
  }
}
