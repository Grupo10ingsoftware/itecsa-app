import { PRODUCTION_STATUS_BY_STEP, PRODUCTION_STATUSES } from '../config/productionCalendar.config.js'

export function getCalendarOrderStatus(order) {
  if (typeof order?.orderStatus === 'string' && order.orderStatus.trim()) {
    return order.orderStatus.trim()
  }

  return PRODUCTION_STATUS_BY_STEP[Number(order?.generalStepId)] ?? PRODUCTION_STATUSES.PAYMENT_CONFIRMATION
}

export function getCalendarOrderQuantity(items) {
  const quantities = (Array.isArray(items) ? items : [])
    .map((item) => item?.quantity)
    .filter((quantity) => quantity !== null && quantity !== undefined && quantity !== '')
    .map(Number)
    .filter(Number.isFinite)

  return quantities.length > 0
    ? quantities.reduce((total, quantity) => total + quantity, 0)
    : null
}
