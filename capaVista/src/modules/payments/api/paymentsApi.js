export function createPaymentsApi(apiClient) {
  return {
    getPaymentOrders: () => apiClient.get('/orders'),
    getPaymentStatuses: () => apiClient.get('/payment-status'),
    updatePaymentStatus: (orderId, payload) =>
      apiClient.patch(`/orders/${orderId}/payment-status`, payload),
    getPaymentSignaturePreview: (orderId) =>
      apiClient.get(`/orders/${orderId}/payment-signature-preview`, {
        responseType: 'blob',
      }),
    getPaymentSignatureEvidence: (orderId) =>
      apiClient.get(`/orders/${orderId}/payment-signature-evidence`, {
        responseType: 'blob',
      }),
  }
}
