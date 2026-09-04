function toQueryString(params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })

  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

export function createMessagesApi(apiClient) {
  return {
    getInbox: (params) => apiClient.get(`/messages${toQueryString(params)}`),
    getMessage: (messageId) => apiClient.get(`/messages/${messageId}`),
    getNotifications: (limit = 10) =>
      apiClient.get(`/messages/notifications${toQueryString({ limit })}`),
    markAsRead: (messageId) => apiClient.patch(`/messages/${messageId}/read`, {}),
    hideNotification: (messageId) =>
      apiClient.patch(`/messages/notifications/${messageId}`),
    clearNotifications: () => apiClient.patch('/messages/notifications'),
  }
}
