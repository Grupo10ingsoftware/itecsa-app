export function createOrdersApi(apiClient) {
  return {
    createOrder: (payload) => apiClient.post('/orders', payload),
  };
}
