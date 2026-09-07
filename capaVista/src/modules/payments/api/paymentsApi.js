export function createPaymentsApi(apiClient) {
  return {
    getPaymentWorkspace: () => apiClient.get('/orders/payments'),
    getPaymentPreview: (orderId) =>
      apiClient.get(`/orders/${orderId}/payment-records/preview`),
    updatePaymentStatus: (orderId, payload) =>
      apiClient.patch(`/orders/${orderId}/payment-status`, payload),
  }
}
