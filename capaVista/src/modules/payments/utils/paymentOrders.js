import { PAYMENT_STATUS } from '@/config/status'

const PAYMENT_STATUS_NAMES = new Set(Object.values(PAYMENT_STATUS))

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeStatusName(status) {
  if (!hasText(status)) return PAYMENT_STATUS.PENDIENTE

  const trimmedStatus = status.trim()
  return PAYMENT_STATUS_NAMES.has(trimmedStatus)
    ? trimmedStatus
    : PAYMENT_STATUS.PENDIENTE
}

function getFileNameFromPath(filePath) {
  if (!hasText(filePath)) return null

  const normalizedPath = filePath.replace(/\\/g, '/')
  const fileName = normalizedPath.split('/').filter(Boolean).at(-1)

  return fileName || null
}

function getSalesNoteFileName(order, nvNumber) {
  const fileNameFromPath = getFileNameFromPath(order.ruta_pdf)

  if (fileNameFromPath) return fileNameFromPath
  if (hasText(order.numero_nota_venta)) return `${nvNumber}.pdf`

  return null
}

export function resolveApiAssetUrl(filePath, baseUrl = import.meta.env.VITE_API_BASE_URL) {
  if (!hasText(filePath)) return null

  const trimmedPath = filePath.trim()

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath
  }

  if (!trimmedPath.startsWith('/api/')) {
    return trimmedPath
  }

  if (!hasText(baseUrl)) {
    return trimmedPath
  }

  try {
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const base = new URL(normalizedBaseUrl)
    const apiBasePath = base.pathname.replace(/\/+$/, '')

    if (apiBasePath && trimmedPath.startsWith(`${apiBasePath}/`)) {
      return new URL(trimmedPath, base.origin).toString()
    }

    return new URL(trimmedPath.replace(/^\/+/, ''), normalizedBaseUrl).toString()
  } catch {
    return trimmedPath
  }
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
  const productName = hasText(order?.nombre_producto)
    ? order.nombre_producto.trim()
    : null
  const signedFilePath = resolveApiAssetUrl(order?.signed_ruta_pdf)
  const signature = order?.firma_pago
    ? {
        timestamp: order.firma_pago.fecha_firma ?? 'Fecha no disponible',
        userId: order.firma_pago.id_usuario
          ? `Usuario #${order.firma_pago.id_usuario}`
          : 'Usuario no disponible',
        note: 'Firma de pago registrada',
      }
    : null

  return {
    id,
    raw: order,
    nvNumber,
    companyName,
    rut: hasText(order?.rut_cliente)
      ? order.rut_cliente.trim()
      : 'RUT no disponible',
    productDescription: hasText(order?.descripcion_producto)
      ? order.descripcion_producto.trim()
      : productName || 'Producto no disponible',
    quantity: order?.cantidad ?? null,
    manufacturingData: hasText(order?.descripcion_producto)
      ? order.descripcion_producto.trim()
      : '',
    productType: productName || 'Producto',
    nvFileName: getSalesNoteFileName(order ?? {}, nvNumber),
    nvFilePath: resolveApiAssetUrl(order?.ruta_pdf),
    signedNvFileName: getFileNameFromPath(signedFilePath),
    signedNvFilePath: signedFilePath,
    orderStatus: order?.nombre_etapa_general ?? null,
    paymentStatus: normalizeStatusName(
      order?.estado_pago ?? order?.nombre_estado_pago,
    ),
    paymentStatusId: order?.id_estado_pago ?? null,
    createdAt: order?.fecha_creacion ?? null,
    updatedAt: order?.fecha_registro ?? null,
    signature,
  }
}

export function normalizePaymentOrders(orders) {
  if (!Array.isArray(orders)) return []

  return orders
    .map(normalizePaymentOrder)
    .filter((order) => order.id !== undefined && order.id !== null)
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
