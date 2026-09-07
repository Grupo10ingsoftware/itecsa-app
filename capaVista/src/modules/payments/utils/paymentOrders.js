import { PAYMENT_STATUS } from '@/config/status'

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

function normalizeTrackedProducts(details) {
  if (!Array.isArray(details)) return []

  return details.map((detail, index) => {
    const explicitProductType = textOrNull(
      detail?.productType ?? detail?.tipoProducto ?? detail?.nombre_producto,
    )

    return {
      id: detail?.id_detalle_pedido ?? detail?.id ?? `detail-${index}`,
      code: textOrNull(
        detail?.code ?? detail?.codigo ?? detail?.codigo_producto,
      ),
      productType: explicitProductType ?? textOrNull(detail?.product),
      product:
        textOrNull(detail?.producto ?? detail?.descripcion_producto) ??
        (explicitProductType ? textOrNull(detail?.product) : null),
      quantity: normalizeQuantity(detail?.cantidad ?? detail?.quantity),
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
  const id = order?.id_pedido ?? order?.id
  const nvNumber = hasText(order?.numero_nota_venta)
    ? order.numero_nota_venta.trim()
    : `Pedido #${id ?? 'sin ID'}`
  const companyName = hasText(order?.razon_social)
    ? order.razon_social.trim()
    : hasText(order?.nombre_cliente)
      ? order.nombre_cliente.trim()
      : 'Cliente sin nombre'
  const trackedProducts = normalizeTrackedProducts(order?.detalles)

  return {
    id,
    nvNumber,
    companyName,
    rut: hasText(order?.rut_cliente)
      ? order.rut_cliente.trim()
      : 'RUT no disponible',
    sellerEmail: hasText(order?.correo_vendedor)
      ? order.correo_vendedor.trim()
      : null,
    trackedProducts,
    paymentStatus: normalizeStatusName(
      order?.estado_pago ?? order?.nombre_estado_pago,
    ),
    createdAt: order?.fecha_creacion ?? null,
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

  const previewProducts = normalizeTrackedProducts(preview.products)

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

  return status?.id_estado_Pago ?? status?.id_estado_pago ?? null
}
