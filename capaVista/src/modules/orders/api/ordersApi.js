import { parseOrderDTO } from '../utils/orderDto'

export function createOrdersApi(apiClient) {
  return {
    getSalesNote: (numeroNota) =>
      apiClient.get(`/orders/sales-notes/${encodeURIComponent(numeroNota)}`),
    createOrder: (payload) => apiClient.post('/orders', payload).then(parseOrderDTO),
  }
}
