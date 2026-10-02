import { KANBAN_LISTO_PRODUCCION_STEP, KANBAN_EN_PRODUCCION_STEP } from './kanbanColumns.js';

export function isPaymentConfirmed(order) {
  return order.paymentStatus === 'Confirmado' || Number(order.paymentStatusId) === 2
}

export function isLanyardItem(item) {
  return String(item.product ?? item.nombre_producto ?? '').toLowerCase().includes('lanyard')
}

export function getProductionPriority(order) {
  if (order.hasContractPriority) return 0
  if (order.isUrgent) return 1
  if (order.isProducing) return 2

  return 3
}

export function compareOrderIds(leftId, rightId) {
  const leftNumber = Number(leftId)
  const rightNumber = Number(rightId)

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber
  }

  return String(leftId).localeCompare(String(rightId))
}

export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function hasOrderLabel(order, expectedNames = []) {
  const normalizedExpectedNames = expectedNames.map(normalizeText)
  const labels = Array.isArray(order.etiquetas) ? order.etiquetas : []

  return labels.some((label) =>
    normalizedExpectedNames.includes(normalizeText(label?.nombre_etiqueta ?? label?.name ?? label)),
  )
}

export function getCoreProductType(value) {
  const normalizedValue = normalizeText(value)

  if (normalizedValue.includes('lanyard')) return 'lanyard'
  if (normalizedValue.includes('tarjeta')) return 'tarjeta'
  if (normalizedValue.includes('yoyo')) return 'yoyo'

  return ''
}

export function getOrderCoreProductTypes(order) {
  const productValues = [
    order.product,
    ...(Array.isArray(order.items) ? order.items.map((item) => item.product) : []),
  ]

  return [...new Set(productValues.map(getCoreProductType).filter(Boolean))]
}

export function hasActiveFilters(filters = {}) {
  return Object.values(filters).some((value) => normalizeText(value).length > 0)
}

export function orderMatchesFilters(order, filters = {}) {
  const normalizedFilters = {
    clientName: normalizeText(filters.clientName),
    nv: normalizeText(filters.nv),
    productType: normalizeText(filters.productType),
    seller: normalizeText(filters.seller),
  }

  if (!Object.values(normalizedFilters).some(Boolean)) return false

  const coreProductTypes = getOrderCoreProductTypes(order)
  const sellerValues = [
    order.seller,
    order.vendedorResponsable,
    order.vendedor_responsable,
    ...(Array.isArray(order.items)
      ? order.items.map((item) => item.seller ?? item.vendedorResponsable ?? item.vendedor_responsable)
      : []),
  ].map(normalizeText)

  if (normalizedFilters.clientName && !normalizeText(order.clientName).includes(normalizedFilters.clientName)) {
    return false
  }

  if (normalizedFilters.nv && !normalizeText(order.nv).includes(normalizedFilters.nv)) {
    return false
  }

  if (normalizedFilters.seller && !sellerValues.some((value) => value.includes(normalizedFilters.seller))) {
    return false
  }

  if (normalizedFilters.productType === 'mixto' && coreProductTypes.length < 2) {
    return false
  }

  if (
    normalizedFilters.productType &&
    normalizedFilters.productType !== 'mixto' &&
    (coreProductTypes.length !== 1 || coreProductTypes[0] !== normalizedFilters.productType)
  ) {
    return false
  }

  return true
}

export function getLanyardProgressPercentage(item) {
  const progress = item?.lanyardProgress
  const percentage = Number(progress?.percentage ?? progress?.progressPercentage ?? 0)

  return Number.isFinite(percentage) ? percentage : 0
}

export function isItemReadyForDelivery(item) {
  if (isLanyardItem(item) && getLanyardProgressPercentage(item) < 100) {
    return false
  }

  return Array.isArray(item.subProcesses) &&
    item.subProcesses.length > 0 &&
    item.subProcesses.every((process) => process.status === 'done')
}

export function sortOrdersForColumn(orders, column, filters) {
  const activeFilters = hasActiveFilters(filters)
  const baseSortedOrders = [KANBAN_LISTO_PRODUCCION_STEP, KANBAN_EN_PRODUCCION_STEP].includes(Number(column.generalStepId))
    ? [...orders].sort((left, right) => {
        if (Number(column.generalStepId) === KANBAN_LISTO_PRODUCCION_STEP) {
          if (left.paymentDeconfirmationRequested !== right.paymentDeconfirmationRequested) {
            return left.paymentDeconfirmationRequested ? -1 : 1
          }
        }

        const priorityDifference = getProductionPriority(left) - getProductionPriority(right)

        if (priorityDifference !== 0) return priorityDifference

        return compareOrderIds(left.id, right.id)
      })
    : orders

  if (!activeFilters) {
    return baseSortedOrders
  }

  return baseSortedOrders.filter((order) => orderMatchesFilters(order, filters))
}
