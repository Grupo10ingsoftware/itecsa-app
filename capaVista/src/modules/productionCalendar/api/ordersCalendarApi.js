export function createOrdersCalendarApi(apiClient) {
  return {
    getOrders: ({ from, to, cursor, limit = 100 } = {}) => {
      const query = new URLSearchParams({ limit: String(limit) })
      if (from) query.set('from', from)
      if (to) query.set('to', to)
      if (cursor) query.set('cursor', cursor)
      return apiClient.get(`/orders/calendar-summary?${query.toString()}`)
    },
    getOrderDetail: (orderId) => apiClient.get(`/orders/${orderId}/calendar-detail`),
    updateDeliveryDate: (orderId, dueDate, payload = {}) =>
      apiClient.patch(`/orders/${orderId}/delivery-date`, {
        dueDate,
        pin: payload.pin,
      }),
  }
}

export async function loadCalendarMonth(api, range, isActive = () => true) {
  const orders = []
  const seenCursors = new Set()
  let cursor = null
  do {
    const result = await api.getOrders({ ...range, cursor })
    if (!isActive()) return []
    orders.push(...(result.items ?? []))
    cursor = result.pageInfo?.hasMore ? result.pageInfo.nextCursor : null
    if (cursor && seenCursors.has(cursor)) throw new Error('El servidor repitió un cursor de calendario.')
    if (cursor) seenCursors.add(cursor)
  } while (cursor)
  return orders
}
