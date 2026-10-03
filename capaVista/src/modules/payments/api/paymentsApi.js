import { parsePaymentOrderDTO, parsePaymentWorkspaceDTO } from '../../orders/utils/orderDto'

export function createPaymentsApi(apiClient) {
  return {
    getPaymentWorkspace: (params = {}) => {
      const query = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
      })
      return apiClient.get(`/orders/payments?${query.toString()}`).then(parsePaymentWorkspaceDTO)
    },
    getPaymentPreview: (orderId) =>
      apiClient.get(`/orders/${orderId}/payment-records/preview`),
    updatePaymentStatus: (orderId, payload) =>
      apiClient.patch(`/orders/${orderId}/payment-status`, payload).then(parsePaymentOrderDTO),
  }
}
