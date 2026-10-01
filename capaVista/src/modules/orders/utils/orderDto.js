const ORDER_FIELDS = [
  'id',
  'salesNoteNumber',
  'createdAt',
  'dueDate',
  'clientId',
  'clientName',
  'clientRut',
  'clientBusinessName',
  'responsibleUserId',
  'sourceManagerUser',
  'product',
  'productDescription',
  'quantity',
  'items',
  'generalStepId',
  'orderStatusId',
  'orderStatus',
  'paymentStatusId',
  'paymentStatus',
  'labels',
  'untrackedItems',
  'comments',
  'commentGroups',
]

const ITEM_FIELDS = [
  'id',
  'productTypeId',
  'product',
  'productDescription',
  'quantity',
  'dueDate',
  'completedAt',
  'subprocessStateId',
  'subprocessStatus',
  'source',
  'manufacturingDetails',
  'lanyardProgress',
  'subProcesses',
]

function assertObject(value, contractName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${contractName} debe ser un objeto.`)
  }
}

function assertFields(value, fields, contractName) {
  const missingFields = fields.filter((field) => !Object.hasOwn(value, field))

  if (missingFields.length > 0) {
    throw new TypeError(`${contractName} no cumple el contrato; faltan: ${missingFields.join(', ')}.`)
  }
}

export function parseOrderDTO(order) {
  assertObject(order, 'OrderDTO')
  assertFields(order, ORDER_FIELDS, 'OrderDTO')

  if (order.id == null) throw new TypeError('OrderDTO.id es obligatorio.')
  if (!Array.isArray(order.items)) throw new TypeError('OrderDTO.items debe ser un arreglo.')
  if (!Array.isArray(order.labels)) throw new TypeError('OrderDTO.labels debe ser un arreglo.')
  if (!Array.isArray(order.comments)) throw new TypeError('OrderDTO.comments debe ser un arreglo.')

  order.items.forEach((item, index) => {
    assertObject(item, `OrderDTO.items[${index}]`)
    assertFields(item, ITEM_FIELDS, `OrderDTO.items[${index}]`)
  })

  return order
}

export function parseOrderListDTO(orders) {
  if (!Array.isArray(orders)) throw new TypeError('La respuesta de pedidos debe ser un arreglo.')

  return orders.map(parseOrderDTO)
}

export function parseOrderStagePatchDTO(patch) {
  assertObject(patch, 'OrderStagePatchDTO')
  assertFields(patch, ['id', 'orderStatusId', 'generalStepId', 'orderStatus'], 'OrderStagePatchDTO')

  return patch
}

export function parseOrderLabelsPatchDTO(patch) {
  assertObject(patch, 'OrderLabelsPatchDTO')
  assertFields(patch, ['id', 'labels'], 'OrderLabelsPatchDTO')

  if (!Array.isArray(patch.labels)) {
    throw new TypeError('OrderLabelsPatchDTO.labels debe ser un arreglo.')
  }

  return patch
}
