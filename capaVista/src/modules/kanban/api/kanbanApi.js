export function createKanbanApi(apiClient) {
  return {
    getOrders: () => apiClient.get('/demo-orders'),
    getAnnouncements: () => apiClient.get('/demo-orders/announcements'),
    getOrderStatuses: () => apiClient.get('/order-status'),
    moveOrder: (orderId, generalStepId, audit = {}) =>
      apiClient.request(`/demo-orders/${orderId}/move`, {
        method: 'PATCH',
        body: {
          generalStepId,
          operatorEmail: audit.operatorEmail,
        },
      }),
    approvePaymentDeconfirmation: (orderId, payload) =>
      apiClient.patch(`/demo-orders/${orderId}/approve-payment-deconfirmation`, payload),
  }
}
