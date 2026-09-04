export function createOrdersCalendarApi(apiClient) {
  return {
    getOrders: () => apiClient.get('/orders'),
    updateDeliveryDate: (orderId, dueDate, payload = {}) =>
      apiClient.patch(`/orders/${orderId}/delivery-date`, {
        dueDate,
        pin: payload.pin,
      }),
  }
}
