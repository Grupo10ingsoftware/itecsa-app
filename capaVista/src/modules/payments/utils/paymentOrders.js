import { PAYMENT_STATUS } from '../../../config/status.js'

const PAYMENT_STATUS_NAMES = new Set(Object.values(PAYMENT_STATUS))

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function textOrNull(value) {
  return hasText(value) ? value.trim() : null
}

function normalizeQuantity(value) {
  if (value === null || value === undefined || value === '') return null

  const quantity = Number(value)
  return Number.isFinite(quantity) ? quantity : null
}

function normalizePreviewProducts(details) {
  if (!Array.isArray(details)) return []

  return details.map((detail, index) => {
    return {
      id: detail?.id ?? `detail-${index}`,
      code: textOrNull(detail?.code),
      productType: textOrNull(detail?.productType),
      product: textOrNull(detail?.product),
      quantity: normalizeQuantity(detail?.quantity),
    }
  })
}

function normalizeStatusName(status) {
  if (!hasText(status)) return PAYMENT_STATUS.PENDIENTE

  const trimmedStatus = status.trim()
  return PAYMENT_STATUS_NAMES.has(trimmedStatus)
    ? trimmedStatus
    : PAYMENT_STATUS.PENDIENTE
}

export function normalizePaymentOrder(order) {
  const id = order?.id
  const nvNumber = hasText(order?.salesNoteNumber)
    ? order.salesNoteNumber.trim()
    : `Pedido #${id ?? 'sin ID'}`
  const companyName = hasText(order?.clientBusinessName)
    ? order.clientBusinessName.trim()
    : hasText(order?.clientName)
      ? order.clientName.trim()
      : 'Cliente sin nombre'

  return {
    id,
    nvNumber,
    companyName,
    rut: hasText(order?.clientRut)
      ? order.clientRut.trim()
      : 'RUT no disponible',
    sellerEmail: null,
    trackedProducts: [],
    paymentStatus: normalizeStatusName(order?.paymentStatus),
    createdAt: order?.createdAt ?? null,
  }
}

export function normalizePaymentOrders(orders) {
  if (!Array.isArray(orders)) return []

  return orders
    .map(normalizePaymentOrder)
    .filter((order) => order.id !== undefined && order.id !== null)
}

export function mergePaymentPreview(order, preview) {
  if (!order || !preview) return order

  const previewProducts = normalizePreviewProducts(preview.products)

  return {
    ...order,
    nvNumber: textOrNull(preview.nvNumber) ?? order.nvNumber,
    companyName: textOrNull(preview.companyName) ?? order.companyName,
    rut: textOrNull(preview.rut) ?? order.rut,
    sellerEmail: textOrNull(preview.sellerEmail) ?? order.sellerEmail,
    trackedProducts:
      previewProducts.length > 0 ? previewProducts : order.trackedProducts,
  }
}

export function getPaymentStatusIdByName(statuses, statusName) {
  const normalizedStatusName = normalizeStatusName(statusName)
  const status = Array.isArray(statuses)
    ? statuses.find(
        (item) =>
          hasText(item?.nombre_estado_pago) &&
          item.nombre_estado_pago.trim() === normalizedStatusName,
      )
    : null

  return status?.id_estado_pago ?? null
}
