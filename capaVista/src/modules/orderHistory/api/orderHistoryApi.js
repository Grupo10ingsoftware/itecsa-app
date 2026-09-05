function queryString(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

export function createOrderHistoryApi(apiClient) {
  return {
    listOrders: (params) => apiClient.get(`/history/orders${queryString(params)}`),
    getOrderHistory: (orderId, type = 'all') =>
      apiClient.get(`/history/orders/${orderId}${queryString({ type })}`),
  }
}
