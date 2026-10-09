import { isBusinessDateKey } from './calendarUtils';
import styles from '../components/ProductionCalendarGrid.module.css';

export function formatDayTitle(dateKey) {
  if (!dateKey) return 'Sin fecha programada'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dateKey}T00:00:00`))
}

export function formatScheduleState(item) {
  if (!item.dueDate) return 'Sin fecha programada'
  if (!isBusinessDateKey(item.dueDate)) return 'Fecha no habil'

  return item.status
}

export function displayValue(value, fallback = 'No definido') {
  if (typeof value === 'string') return value.trim() || fallback

  return value ?? fallback
}

export function getProductSummary(item) {
  if (Array.isArray(item.productTypes) && item.productTypes.length > 0) {
    return item.productTypes.join(', ')
  }

  const sourceItems = Array.isArray(item.items) ? item.items : []
  const productNames = sourceItems
    .map((detail) => detail.product)
    .filter(Boolean)
  const uniqueProductNames = [...new Set(productNames)]

  return uniqueProductNames.length > 0
    ? uniqueProductNames.join(', ')
    : item.productType
}

export function isLanyardItem(item) {
  return String(item.product ?? item.productType ?? '').toLowerCase().includes('lanyard')
}

export function getCalendarOrderItems(order) {
  const sourceItems = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [{
        id: `${order.id}-principal`,
        product: order.productType,
        quantity: order.quantity,
        dueDate: order.dueDate,
        manufacturingDetails: null,
      }]

  return sourceItems.map((item, index) => ({
    ...item,
    id: item.id ?? `${order.id}-${index}`,
    product: item.product ?? order.productType ?? 'Producto no definido',
    quantity: item.quantity ?? order.quantity ?? null,
    dueDate: item.dueDate ?? order.dueDate ?? null,
    manufacturingDetails: item.manufacturingDetails ?? {},
  }))
}

export function getManufacturingDetails(item, order) {
  const details = item.manufacturingDetails ?? {}

  return {
    width: displayValue(details.width),
    length: displayValue(details.length),
    tapeTexture: displayValue(details.tapeTexture),
    backgroundColor: displayValue(details.backgroundColor),
    reverseLegend: displayValue(details.reverseLegend),
    frontLegend: displayValue(details.frontLegend),
    endings: displayValue(details.endings),
    cardType: displayValue(details.cardType),
    seller: displayValue(order.seller),
    dueDate: displayValue(item.dueDate ?? order.dueDate, 'Por definir'),
  }
}

export function normalizeLabelName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function hasOrderLabel(order, expectedNames = []) {
  const labels = Array.isArray(order.labels) ? order.labels : []
  const normalizedExpectedNames = expectedNames.map(normalizeLabelName)

  return labels.some((label) =>
    normalizedExpectedNames.includes(normalizeLabelName(label?.name)),
  )
}

export function getOrderToneClass(order) {
  if (hasOrderLabel(order, ['Prioridad por contrato', 'Cliente con contrato'])) return styles.contractPriorityEvent
  if (hasOrderLabel(order, ['Urgencia'])) return styles.urgentEvent

  return ''
}
