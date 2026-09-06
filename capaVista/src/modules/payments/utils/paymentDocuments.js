import { PAYMENT_STATUS } from '@/config/status'

export function formatPaymentDate(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}-${month}-${year}`
}

export function formatPaymentDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const displayHour = String(hours % 12 || 12).padStart(2, '0')
  const meridiem = hours < 12 ? 'a. m.' : 'p. m.'

  return `${day}-${month}-${year}, ${displayHour}:${minutes} ${meridiem}`
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
