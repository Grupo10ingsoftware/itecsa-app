function queryString(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

export function createMetricsApi(apiClient) {
  return {
    getSummary: ({ from, to }) => apiClient.get(`/metrics/summary${queryString({ from, to })}`),
  }
}