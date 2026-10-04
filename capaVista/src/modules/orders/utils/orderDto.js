function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} debe ser un objeto.`)
}

function requireFields(value, fields, name) {
  assertObject(value, name)
  const missing = fields.filter((field) => !Object.hasOwn(value, field))
  if (missing.length) throw new TypeError(`${name} no cumple el contrato; faltan: ${missing.join(', ')}.`)
  return value
}

const PAGE_FIELDS = ['items', 'pageInfo']
const SUMMARY_FIELDS = ['id', 'salesNoteNumber', 'clientName', 'dueDate', 'generalStepId', 'orderStatus', 'labels', 'items']
const ITEM_FIELDS = ['id', 'product', 'quantity', 'dueDate', 'manufacturingDetails', 'lanyardProgress', 'subProcesses']

function parseSummary(order, name) {
  requireFields(order, SUMMARY_FIELDS, name)
  if (!Array.isArray(order.labels) || !Array.isArray(order.items)) throw new TypeError(`${name} requiere labels e items como arreglos.`)
  order.labels.forEach((label, index) => {
    requireFields(label, ['id', 'name'], `${name}.labels[${index}]`)
    if (label.name !== null && typeof label.name !== 'string') throw new TypeError(`${name}.labels[${index}].name debe ser texto o null.`)
  })
  order.items.forEach((item, index) => requireFields(item, ITEM_FIELDS, `${name}.items[${index}]`))
  return order
}

function parsePage(page, itemParser, name) {
  requireFields(page, PAGE_FIELDS, name)
  if (!Array.isArray(page.items)) throw new TypeError(`${name}.items debe ser un arreglo.`)
  requireFields(page.pageInfo, ['nextCursor', 'hasMore'], `${name}.pageInfo`)
  return { ...page, items: page.items.map(itemParser) }
}

export const parseKanbanOrderSummaryDTO = (order) => {
  parseSummary(order, 'KanbanOrderSummaryDTO')
  return requireFields(order, ['createdAt', 'paymentStatusId', 'paymentStatus'], 'KanbanOrderSummaryDTO')
}
export const parseKanbanOrderDetailDTO = (order) => {
  parseKanbanOrderSummaryDTO(order)
  return requireFields(order, ['comments', 'commentGroups'], 'KanbanOrderDetailDTO')
}
export const parseKanbanPageDTO = (page) => parsePage(page, parseKanbanOrderSummaryDTO, 'KanbanPageDTO')

export const parseCalendarOrderSummaryDTO = (order) => parseSummary(order, 'CalendarOrderSummaryDTO')
export const parseCalendarOrderDetailDTO = (order) => {
  parseCalendarOrderSummaryDTO(order)
  return requireFields(order, ['seller'], 'CalendarOrderDetailDTO')
}
export const parseCalendarPageDTO = (page) => parsePage(page, parseCalendarOrderSummaryDTO, 'CalendarPageDTO')

export function parsePaymentOrderDTO(order) {
  return requireFields(order, ['id', 'salesNoteNumber', 'createdAt', 'clientName', 'clientBusinessName', 'clientRut', 'paymentStatusId', 'paymentStatus'], 'PaymentOrderDTO')
}
export function parsePaymentWorkspaceDTO(workspace) {
  parsePage(workspace, parsePaymentOrderDTO, 'PaymentWorkspaceDTO')
  requireFields(workspace, ['counts', 'paymentStatuses'], 'PaymentWorkspaceDTO')
  return { ...workspace, items: workspace.items.map(parsePaymentOrderDTO) }
}

export const parseOrderCreatedDTO = (order) => requireFields(order, ['id', 'salesNoteNumber'], 'OrderCreatedDTO')
export const parseOrderStagePatchDTO = (patch) => requireFields(patch, ['id', 'orderStatusId', 'generalStepId', 'orderStatus'], 'OrderStagePatchDTO')
export function parseOrderLabelsPatchDTO(patch) {
  requireFields(patch, ['id', 'labels'], 'OrderLabelsPatchDTO')
  if (!Array.isArray(patch.labels)) throw new TypeError('OrderLabelsPatchDTO.labels debe ser un arreglo.')
  return patch
}

// Nombres previos conservados solo para imports internos mientras los módulos migran.
export const parseOrderDTO = parseKanbanOrderDetailDTO
export const parseOrderListDTO = (orders) => {
  if (!Array.isArray(orders)) throw new TypeError('La respuesta de pedidos debe ser un arreglo.')
  return orders.map(parseKanbanOrderDetailDTO)
}
