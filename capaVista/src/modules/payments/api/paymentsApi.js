export function createPaymentsApi(apiClient) {
  return {
    // Temporal: Cobranza usa demo-orders para compartir pedidos con Kanban y Calendario
    // mientras Registro de Orden y la BD real quedan pendientes de integracion.
    getPaymentOrders: () => apiClient.get('/demo-orders/payment-orders'),
    getPaymentStatuses: () => apiClient.get('/demo-orders/payment-status'),
    updatePaymentStatus: (orderId, payload) =>
      apiClient.patch(`/demo-orders/${orderId}/payment-status`, payload),
  }
}
