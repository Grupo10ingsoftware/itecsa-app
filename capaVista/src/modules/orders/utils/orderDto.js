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
const MANUFACTURING_FIELDS = ['width', 'length', 'tapeTexture', 'backgroundColor', 'reverseLegend', 'frontLegend', 'endings', 'cardType']
const COMMENT_GROUP_FIELDS = ['all', 'source', 'subprocesses', 'system']

function parseLabel(label, name) {
  requireFields(label, ['id', 'name'], name)
  if (!Number.isInteger(Number(label.id)) || Number(label.id) <= 0) throw new TypeError(`${name}.id debe ser un identificador valido.`)
  if (typeof label.name !== 'string' || !label.name.trim()) throw new TypeError(`${name}.name debe ser texto no vacio.`)
  return label
}

function parseManufacturingDetails(details, name) {
  if (details === null) return details
  return requireFields(details, MANUFACTURING_FIELDS, name)
}

function parseItem(item, name) {
  requireFields(item, ITEM_FIELDS, name)
  if (!Array.isArray(item.subProcesses)) throw new TypeError(`${name}.subProcesses debe ser un arreglo.`)
  parseManufacturingDetails(item.manufacturingDetails, `${name}.manufacturingDetails`)
  return item
}

function parseComment(comment, name) {
  requireFields(comment, ['id', 'text', 'createdAt'], name)
  if (typeof comment.text !== 'string' || !comment.text.trim()) throw new TypeError(`${name}.text debe ser texto no vacio.`)
  return comment
}

function parseCommentGroups(groups, name) {
  requireFields(groups, COMMENT_GROUP_FIELDS, name)
  for (const group of COMMENT_GROUP_FIELDS) {
    if (!Array.isArray(groups[group])) throw new TypeError(`${name}.${group} debe ser un arreglo.`)
    groups[group].forEach((entry, index) => parseComment(entry, `${name}.${group}[${index}]`))
  }
  return groups
}

function parseSummary(order, name) {
  requireFields(order, SUMMARY_FIELDS, name)
  if (!Array.isArray(order.labels) || !Array.isArray(order.items)) throw new TypeError(`${name} requiere labels e items como arreglos.`)
  order.labels.forEach((label, index) => parseLabel(label, `${name}.labels[${index}]`))
  order.items.forEach((item, index) => parseItem(item, `${name}.items[${index}]`))
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
  requireFields(order, ['seller', 'comments', 'commentGroups'], 'KanbanOrderDetailDTO')
  if (!Array.isArray(order.comments)) throw new TypeError('KanbanOrderDetailDTO.comments debe ser un arreglo.')
  order.comments.forEach((entry, index) => parseComment(entry, `KanbanOrderDetailDTO.comments[${index}]`))
  parseCommentGroups(order.commentGroups, 'KanbanOrderDetailDTO.commentGroups')
  return order
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
  if (!Array.isArray(workspace.paymentStatuses)) throw new TypeError('PaymentWorkspaceDTO.paymentStatuses debe ser un arreglo.')
  workspace.paymentStatuses.forEach((status, index) => {
    requireFields(status, ['id', 'name'], `PaymentWorkspaceDTO.paymentStatuses[${index}]`)
    if (!Number.isInteger(Number(status.id)) || Number(status.id) <= 0) throw new TypeError(`PaymentWorkspaceDTO.paymentStatuses[${index}].id debe ser valido.`)
    if (typeof status.name !== 'string' || !status.name.trim()) throw new TypeError(`PaymentWorkspaceDTO.paymentStatuses[${index}].name debe ser texto no vacio.`)
  })
  return { ...workspace, items: workspace.items.map(parsePaymentOrderDTO) }
}

export const parseOrderCreatedDTO = (order) => requireFields(order, ['id', 'salesNoteNumber'], 'OrderCreatedDTO')
export const parseOrderStagePatchDTO = (patch) => requireFields(patch, ['id', 'orderStatusId', 'generalStepId', 'orderStatus'], 'OrderStagePatchDTO')
export function parseOrderLabelsPatchDTO(patch) {
  requireFields(patch, ['id', 'labels'], 'OrderLabelsPatchDTO')
  if (!Array.isArray(patch.labels)) throw new TypeError('OrderLabelsPatchDTO.labels debe ser un arreglo.')
  patch.labels.forEach((label, index) => parseLabel(label, `OrderLabelsPatchDTO.labels[${index}]`))
  return patch
}
