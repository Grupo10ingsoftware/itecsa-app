import { parseOrderDTO, parseOrderListDTO } from '../../orders/utils/orderDto'

export function createOrdersCalendarApi(apiClient) {
  return {
    getOrders: () => apiClient.get('/orders').then(parseOrderListDTO),
    updateDeliveryDate: (orderId, dueDate, payload = {}) =>
      apiClient.patch(`/orders/${orderId}/delivery-date`, {
        dueDate,
        pin: payload.pin,
      }).then(parseOrderDTO),
  }
}
