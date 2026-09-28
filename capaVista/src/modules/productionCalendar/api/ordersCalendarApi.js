export function createOrdersCalendarApi(apiClient) {
  return {
    getOrders: ({ from, to, cursor, limit = 100 } = {}) => {
      const query = new URLSearchParams({ limit: String(limit) })
      if (from) query.set('from', from)
      if (to) query.set('to', to)
      if (cursor) query.set('cursor', cursor)
      return apiClient.get(`/orders?${query.toString()}`)
    },
    updateDeliveryDate: (orderId, dueDate, payload = {}) =>
      apiClient.patch(`/orders/${orderId}/delivery-date`, {
        dueDate,
        pin: payload.pin,
      }),
  }
}
