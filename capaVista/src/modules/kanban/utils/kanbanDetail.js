

export const KANBAN_LISTO_PRODUCCION_STEP = 1

export const KANBAN_EN_PRODUCCION_STEP = 2

export function formatStatus(status) {
  return status === 'done' ? 'Completado' : 'Pendiente'
}

export function getSubProcessesForItem(item) {
  const existingProcesses = Array.isArray(item.subProcesses) ? item.subProcesses : []

  return existingProcesses.map((process, index) => ({
    ...process,
    id: process.id ?? String(process.id_estado_subproceso ?? index),
    name: process.name ?? process.nombre_estado ?? 'Subproceso',
    status: process.status ?? 'pending',
  }))
}

export function isLanyardItem(item) {
  return String(item.product ?? '').toLowerCase().includes('lanyard')
}

export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function isPackagingProcess(process) {
  return normalizeText(process?.name ?? process?.nombre_estado).includes('empaquet')
}

export function getLanyardProgress(item) {
  const progress = item?.lanyardProgress ?? {}
  const totalQuantity = Number(progress.totalQuantity ?? item?.quantity ?? 0)
  const accumulatedQuantity = Number(progress.accumulatedQuantity ?? 0)
  const remainingQuantity = Number(progress.remainingQuantity ?? Math.max(0, totalQuantity - accumulatedQuantity))
  const percentage = Number(progress.percentage ?? progress.progressPercentage ?? 0)

  return {
    accumulatedQuantity: Number.isFinite(accumulatedQuantity) ? accumulatedQuantity : 0,
    remainingQuantity: Number.isFinite(remainingQuantity) ? remainingQuantity : 0,
    totalQuantity: Number.isFinite(totalQuantity) ? totalQuantity : 0,
    percentage: Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0,
  }
}

export function isLanyardPackagingBlocked(item, process) {
  return isLanyardItem(item) && isPackagingProcess(process) && getLanyardProgress(item).percentage < 100
}

export function displayValue(value, fallback = 'No definido') {
  if (typeof value === 'string') return value.trim() || fallback

  return value ?? fallback
}

export function formatCommentDate(value) {
  if (!value) return 'Fecha no definida'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Fecha no definida'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function normalizeCommentItem(item, index, type = 'system') {
  return {
    ...item,
    id: item?.id ?? `${type}-${index}`,
    text: item?.text ?? item?.comentario ?? item?.observacion ?? '',
    createdAt: item?.createdAt ?? item?.fecha_comentario ?? item?.FECHA_HORA ?? null,
    subprocessName: item?.subprocessName ?? item?.subproceso ?? item?.nombre_estado ?? 'Subproceso',
  }
}

export function sortCommentsByDate(comments = []) {
  return [...comments].sort((left, right) => new Date(left.createdAt ?? 0) - new Date(right.createdAt ?? 0))
}

export function getCommentGroups(order) {
  const groups = order.commentGroups
  const legacyComments = Array.isArray(order.comments)
    ? order.comments.map((item, index) => normalizeCommentItem(item, index, 'system'))
    : []

  return {
    source: sortCommentsByDate((groups?.source ?? []).map((item, index) => normalizeCommentItem(item, index, 'source'))),
    system: sortCommentsByDate(
      (groups?.system ?? legacyComments).map((item, index) => normalizeCommentItem(item, index, 'system')),
    ),
    subprocesses: sortCommentsByDate(
      (groups?.subprocesses ?? []).map((item, index) => normalizeCommentItem(item, index, 'subprocess')),
    ),
  }
}

export function getOrderItems(order) {
  const items = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [
        {
          id: `${order.id}-principal`,
          product: order.product,
          quantity: order.quantity,
          dueDate: order.dueDate,
          manufacturingDetails: order.manufacturingDetails,
          lanyardProgress: order.lanyardProgress,
          subProcesses: order.subProcesses,
        },
      ]

  return items
    .map((item, index) => ({
      ...item,
      id: item.id ?? `${order.id}-${index}`,
      product: item.product ?? order.product ?? 'Producto no definido',
      quantity: item.quantity ?? order.quantity ?? null,
      dueDate: item.dueDate ?? order.dueDate ?? null,
      lanyardProgress: item.lanyardProgress ?? null,
      subProcesses: getSubProcessesForItem(item),
    }))
    .sort((left, right) => {
      const leftPriority = isLanyardItem(left) ? 0 : 1
      const rightPriority = isLanyardItem(right) ? 0 : 1

      return leftPriority - rightPriority
    })
}

export function getManufacturingDetails(item, order) {
  const productName = String(item.product ?? '').toLowerCase()
  const isTarjeta = productName.includes('tarjeta')
  const isLanyard = productName.includes('lanyard')
  const details = item.manufacturingDetails ?? {}

  return {
    width: details.width ?? (isTarjeta ? '85.6 mm' : isLanyard ? '20 mm' : 'No definido'),
    length: details.length ?? (isTarjeta ? '53.9 mm' : isLanyard ? '90 cm' : 'No definido'),
    tapeTexture: details.tapeTexture ?? 'Poliester',
    backgroundColor: details.backgroundColor ?? 'No definido',
    reverseLegend: details.reverseLegend ?? details.legend ?? 'No definido',
    frontLegend: details.frontLegend ?? details.legend ?? `${order.clientName ?? 'Cliente'} - ${item.product ?? 'Producto'}`,
    endings: details.endings ?? 'No definido',
    cardType: details.cardType ?? 'Plastificada',
    seller: details.seller ?? order.seller ?? 'Ventas ITECSA',
    dueDate: displayValue(details.dueDate ?? item.dueDate ?? order.dueDate, 'Por definir'),
  }
}
