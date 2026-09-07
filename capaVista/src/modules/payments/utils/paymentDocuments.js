import { PAYMENT_STATUS } from '@/config/status'

export function getPaymentDateKey(value) {
  if (!value) return null

  if (typeof value === 'string') {
    const datePrefix = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (datePrefix) return datePrefix[1]
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return null

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatPaymentDate(value) {
  const dateKey = getPaymentDateKey(value)

  if (!dateKey) return 'Fecha no disponible'

  const [year, month, day] = dateKey.split('-')

  return `${day}-${month}-${year}`
}

export function isPaymentDateInRange(value, dateFrom, dateTo) {
  const dateKey = getPaymentDateKey(value)

  if (!dateKey) return !dateFrom && !dateTo
  if (dateFrom && dateKey < dateFrom) return false
  if (dateTo && dateKey > dateTo) return false

  return true
}

export function getPaymentActionMeta(targetStatus) {
  if (targetStatus === PAYMENT_STATUS.CONFIRMADO) {
    return {
      modalTitle: 'Confirmar pago',
      holdLabel: 'Validar cambio',
      completedLabel: 'Validando cambio...',
    }
  }

  if (targetStatus === PAYMENT_STATUS.RECHAZADO) {
    return {
      modalTitle: 'Rechazar pago',
      holdLabel: 'Validar cambio',
      completedLabel: 'Confirmando cambio...',
    }
  }

  return {
    modalTitle: 'Marcar como pendiente',
    holdLabel: 'Validar cambio',
    completedLabel: 'Confirmando cambio...',
  }
}
