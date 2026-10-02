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
    .map((detail) => detail.productType ?? detail.product ?? detail.nombre_producto ?? detail.producto)
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
        manufacturingDetails: order.manufacturingDetails,
      }]

  return sourceItems.map((item, index) => ({
    ...item,
    id: item.id ?? item.id_detalle_pedido ?? `${order.id}-${index}`,
    product: item.product ?? item.productType ?? item.nombre_producto ?? item.producto ?? order.productType ?? 'Producto no definido',
    quantity: item.quantity ?? item.cantidad ?? order.quantity ?? null,
    dueDate: item.dueDate ?? item.fecha_estimada_termino ?? order.dueDate ?? null,
    manufacturingDetails: item.manufacturingDetails ?? {},
  }))
}

export function getManufacturingDetails(item, order) {
  const productName = String(item.product ?? '').toLowerCase()
  const isTarjeta = productName.includes('tarjeta')
  const isLanyard = productName.includes('lanyard')
  const details = item.manufacturingDetails ?? {}

  return {
    width: displayValue(details.width, isTarjeta ? '85.6 mm' : isLanyard ? '20 mm' : 'No definido'),
    length: displayValue(details.length, isTarjeta ? '53.9 mm' : isLanyard ? '90 cm' : 'No definido'),
    tapeTexture: displayValue(details.tapeTexture, 'Poliester'),
    backgroundColor: displayValue(details.backgroundColor),
    reverseLegend: displayValue(details.reverseLegend ?? details.legend),
    frontLegend: displayValue(details.frontLegend ?? details.legend, `${order.clientName ?? 'Cliente'} - ${item.product ?? 'Producto'}`),
    endings: displayValue(details.endings),
    cardType: displayValue(details.cardType, 'Plastificada'),
    seller: displayValue(details.seller ?? order.seller, 'Ventas ITECSA'),
    dueDate: displayValue(details.dueDate ?? item.dueDate ?? order.dueDate, 'Por definir'),
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
  const labels = Array.isArray(order.etiquetas) ? order.etiquetas : []
  const normalizedExpectedNames = expectedNames.map(normalizeLabelName)

  return labels.some((label) =>
    normalizedExpectedNames.includes(normalizeLabelName(label?.nombre_etiqueta ?? label?.name ?? label)),
  )
}

export function getOrderToneClass(order) {
  if (hasOrderLabel(order, ['Prioridad por contrato', 'Cliente con contrato'])) return styles.contractPriorityEvent
  if (hasOrderLabel(order, ['Urgencia'])) return styles.urgentEvent

  return ''
}
