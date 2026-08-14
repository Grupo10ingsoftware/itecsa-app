import { ACTION_STATUS, PAYMENT_STATUS } from '@/config/status'

const VALID_PAYMENT_STATUSES = Object.values(PAYMENT_STATUS)

export function isValidPaymentStatus(status) {
  return VALID_PAYMENT_STATUSES.includes(status)
}

export function applyMockPaymentStatusTransition(order, newStatus) {
  if (!isValidPaymentStatus(newStatus)) return order

  const baseOrder = {
    ...order,
    paymentStatus: newStatus,
    updatedAt: new Date(),
  }

  if (newStatus === PAYMENT_STATUS.CONFIRMADO) {
    return {
      ...baseOrder,
      orderStatus: ACTION_STATUS.LISTO_PRODUCCION,
    }
  }

  return {
    ...baseOrder,
    orderStatus: ACTION_STATUS.SOLICITADO,
  }
}
