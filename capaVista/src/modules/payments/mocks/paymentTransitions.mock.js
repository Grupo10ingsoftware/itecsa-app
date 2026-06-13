import { ACTION_STATUS, PAYMENT_STATUS } from '@/config/status'
import { formatPaymentDateTime } from '../utils/paymentDocuments'
import { MOCK_SIGNATURE_NOTE } from './paymentDocuments.mock'

const VALID_PAYMENT_STATUSES = Object.values(PAYMENT_STATUS)

export function isValidPaymentStatus(status) {
  return VALID_PAYMENT_STATUSES.includes(status)
}

function buildMockSignature(orderId, paymentStatus) {
  if (paymentStatus !== PAYMENT_STATUS.CONFIRMADO) return null

  return {
    timestamp: formatPaymentDateTime(new Date()),
    userId: `USR-${String(orderId).padStart(4, '0')}`,
    note: MOCK_SIGNATURE_NOTE,
  }
}

function removeSignedDocumentData(order) {
  const nextOrder = { ...order }

  delete nextOrder.signature
  delete nextOrder.isSigned

  return nextOrder
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
      signature: buildMockSignature(order.id, newStatus),
      isSigned: true,
    }
  }

  return {
    ...removeSignedDocumentData(baseOrder),
    orderStatus: ACTION_STATUS.SOLICITADO,
  }
}
