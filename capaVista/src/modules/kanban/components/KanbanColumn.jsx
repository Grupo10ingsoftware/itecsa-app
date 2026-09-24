import { useEffect, useState } from 'react'
import Toast from 'react-bootstrap/Toast'
import ToastContainer from 'react-bootstrap/ToastContainer'
import { DragDropProvider, useDroppable } from '@dnd-kit/react'
import { PERMISSIONS } from '../../../config/permissions'
import { useAuth } from '../../../hooks/useAuth'
import { useKanbanApi } from '../hooks/useKanbanApi'
import { applyOrderStagePatch } from '../utils/orderStagePatch'
import KanbanCard from './KanbanCard'
import KanbanOffCanvas from './KanbanOffCanvas'
import styles from '../styles/Kanban.module.css'

const MOVE_TO_PRODUCTION_PERMISSION_MESSAGE = 'Solo un administrador puede mover pedidos a En produccion.'
const STAGE_SKIP_MESSAGE = 'No puedes saltar etapas del pedido.'
const STAGE_BACKWARD_MESSAGE = 'No puedes retroceder en las etapas del pedido.'
const KANBAN_EN_PRODUCCION_STEP = 2
const KANBAN_LISTO_PRODUCCION_STEP = 1
const KANBAN_REVISION_STEP = 6

const baseColumns = [
  {
    id: 'confirmacion-pago',
    title: 'Confirmacion de pago',
    generalStepId: 0,
    accent: '#f97316',
    icon: 'bi-cash-coin',
  },
  {
    id: 'listo-produccion',
    title: 'Listo para produccion',
    generalStepId: 1,
    accent: '#2563eb',
    icon: 'bi-clipboard-check',
  },
  {
    id: 'en-produccion',
    title: 'En produccion',
    generalStepId: 2,
    accent: '#d97706',
    icon: 'bi-gear-wide-connected',
  },
  {
    id: 'listo-entrega',
    title: 'Listo para entrega',
    generalStepId: 3,
    accent: '#248f55',
    icon: 'bi-check2-circle',
  },
  { id: 'en-revision', title: 'En revision', generalStepId: KANBAN_REVISION_STEP, accent: '#dc2626', icon: 'bi-search' },
]

function getColumnTitleByStepId(stepId) {
  const column = baseColumns.find((item) => Number(item.generalStepId) === Number(stepId))
  return column?.title ?? 'Confirmacion de pago'
}

function parseDate(value) {
  if (!value) {
    return null
  }

  const isoDateMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch.map(Number)
    const parsedDate = new Date(year, month - 1, day)

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  const localDateMatch = String(value).match(/^(\d{2})-(\d{2})-(\d{4})$/)

  if (localDateMatch) {
    const [, day, month, year] = localDateMatch.map(Number)
    const parsedDate = new Date(year, month - 1, day)

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  const date = new Date(value)

  if (!Number.isNaN(date.getTime())) {
    return date
  }

  return null
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return today
}

function isBusinessDay(date) {
  const day = date.getDay()

  return day >= 1 && day <= 5
}

function countBusinessDaysUntil(dueDate) {
  const parsedDueDate = parseDate(dueDate)

  if (!parsedDueDate) {
    return null
  }

  const today = startOfToday()
  parsedDueDate.setHours(0, 0, 0, 0)

  if (parsedDueDate < today) {
    return -1
  }

  let businessDays = 0
  const cursor = new Date(today)
  cursor.setDate(cursor.getDate() + 1)

  while (cursor <= parsedDueDate) {
    if (isBusinessDay(cursor)) {
      businessDays += 1
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return businessDays
}

function getDeliveryDelayStatus(dueDate) {
  const businessDaysRemaining = countBusinessDaysUntil(dueDate)

  if (businessDaysRemaining === null) {
    return { status: 'neutral', businessDaysRemaining: null }
  }

  if (businessDaysRemaining <= 2) {
    return { status: 'red', businessDaysRemaining }
  }

  if (businessDaysRemaining <= 5) {
    return { status: 'yellow', businessDaysRemaining }
  }

  return { status: 'green', businessDaysRemaining }
}

function isOrderDelayed(dueDate) {
  const businessDaysRemaining = countBusinessDaysUntil(dueDate)

  return businessDaysRemaining !== null && businessDaysRemaining < 0
}

function isOrderUrgent(dueDate) {
  const businessDaysRemaining = countBusinessDaysUntil(dueDate)

  if (businessDaysRemaining === null || businessDaysRemaining < 0) {
    return false
  }

  return businessDaysRemaining <= 3
}

function isPaymentConfirmed(order) {
  return order.paymentStatus === 'Confirmado' || Number(order.paymentStatusId) === 2
}

function isLanyardItem(item) {
  return String(item.product ?? item.nombre_producto ?? '').toLowerCase().includes('lanyard')
}

function toDateKey(value) {
  return value ? String(value).slice(0, 10) : ''
}

function createItemFromDetail(detail, index) {
  const product = detail.nombre_producto ?? detail.product ?? 'Producto no definido'

  return {
    id: String(detail.id_detalle_pedido ?? `${normalizeProcessName(product)}-${index}`),
    product,
    quantity: detail.cantidad ?? detail.quantity ?? null,
    dueDate: toDateKey(detail.fecha_estimada_termino ?? detail.dueDate),
    manufacturingDetails: detail.manufacturingDetails ?? null,
    lanyardProgress: detail.lanyardProgress ?? null,
    subProcesses: Array.isArray(detail.subProcesses)
      ? detail.subProcesses
      : Array.isArray(detail.subprocesos)
        ? detail.subprocesos
        : [],
  }
}

function normalizeProcessName(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
}

function buildOrderItems(order, product, dueDate) {
  const sourceItems = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : Array.isArray(order.detalles) && order.detalles.length > 0
      ? order.detalles
      : []

  const items = sourceItems.map(createItemFromDetail)

  if (items.length === 0) {
    items.push({
      id: `${order.id ?? order.id_pedido}-principal`,
      product,
      quantity: order.quantity ?? order.cantidad ?? null,
      dueDate,
      manufacturingDetails: order.manufacturingDetails ?? null,
      lanyardProgress: order.lanyardProgress ?? null,
      subProcesses: Array.isArray(order.subProcesses)
        ? order.subProcesses
        : Array.isArray(order.subprocesos)
          ? order.subprocesos
          : [],
    })
  }

  return items.sort((left, right) => {
    const leftPriority = isLanyardItem(left) ? 0 : 1
    const rightPriority = isLanyardItem(right) ? 0 : 1

    return leftPriority - rightPriority
  })
}

function normalizeOrder(order) {
  const id = order.id ?? order.id_pedido
  const product = order.product ?? order.producto ?? order.nombre_producto ?? 'Producto no definido'
  const dueDate =
    toDateKey(
      order.dueDate ??
      order.fecha_estimada_termino ??
      order.fecha_entrega ??
      order.fecha_compromiso,
    )

  const items = buildOrderItems(order, product, dueDate)
  const deliveryDelay = getDeliveryDelayStatus(dueDate)

  return {
    id,
    clientName: order.clientName ?? order.cliente ?? order.nombre_cliente ?? 'Cliente sin nombre',
    seller: order.seller ?? order.vendedorResponsable ?? order.vendedor_responsable ?? order.usuario_manager_origen ?? '',
    nv: order.nv ?? order.numero_nota_venta ?? order.codigo_nota_venta ?? order.codigo_nv ?? `PED-${id}`,
    product,
    date: order.date ?? order.fecha ?? order.fecha_pedido ?? '',
    dueDate,
    paymentStatus: order.paymentStatus ?? order.estado_pago ?? '',
    paymentStatusId: order.paymentStatusId ?? order.id_estado_pago,
    orderStatus:
      order.orderStatus ??
      order.etapa_general ??
      order.nombre_etapa_general ??
      getColumnTitleByStepId(order.id_etapa_general),
    generalStepId: order.generalStepId ?? order.id_etapa_general,
    isDelayed: Boolean(order.isDelayed ?? order.atrasado ?? isOrderDelayed(dueDate)),
    delayStatus: order.delayStatus ?? deliveryDelay.status,
    businessDaysRemaining: order.businessDaysRemaining ?? deliveryDelay.businessDaysRemaining,
    isUrgent: Boolean(order.isUrgent ?? order.urgente ?? (hasOrderLabel(order, ['Urgencia']) || isOrderUrgent(dueDate))),
    hasContractPriority: Boolean(
      order.hasContractPriority ??
      order.prioridad_contrato ??
      hasOrderLabel(order, ['Prioridad por contrato', 'Cliente con contrato']),
    ),
    isProducing: Boolean(order.isProducing ?? hasOrderLabel(order, ['PRODUCIÉNDOSE', 'PRODUCIENDOSE'])),
    etiquetas: order.etiquetas ?? [],
    quantity: order.quantity ?? order.cantidad ?? null,
    items,
    subProcesses: Array.isArray(order.subProcesses)
      ? order.subProcesses
      : Array.isArray(order.subprocesos)
        ? order.subprocesos
        : [],
    comments: Array.isArray(order.comments)
      ? order.comments
      : Array.isArray(order.comentarios)
        ? order.comentarios
        : [],
    commentGroups: order.commentGroups ?? null,
    correctionRequested: Boolean(order.correctionRequested),
    correctionComment: order.correctionComment ?? '',
    correctionRequestedAt: order.correctionRequestedAt ?? null,
    paymentDeconfirmationRequested: Boolean(order.paymentDeconfirmationRequested),
    paymentDeconfirmationRequestedAt: order.paymentDeconfirmationRequestedAt ?? null,
    paymentDeconfirmationRequestedBy: order.paymentDeconfirmationRequestedBy ?? null,
    manufacturingDetails: order.manufacturingDetails ?? null,
  }
}

function getProductionPriority(order) {
  if (order.hasContractPriority) return 0
  if (order.isUrgent) return 1
  if (order.isProducing) return 2

  return 3
}

function compareOrderIds(leftId, rightId) {
  const leftNumber = Number(leftId)
  const rightNumber = Number(rightId)

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber
  }

  return String(leftId).localeCompare(String(rightId))
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function hasOrderLabel(order, expectedNames = []) {
  const normalizedExpectedNames = expectedNames.map(normalizeText)
  const labels = Array.isArray(order.etiquetas) ? order.etiquetas : []

  return labels.some((label) =>
    normalizedExpectedNames.includes(normalizeText(label?.nombre_etiqueta ?? label?.name ?? label)),
  )
}

function getCoreProductType(value) {
  const normalizedValue = normalizeText(value)

  if (normalizedValue.includes('lanyard')) return 'lanyard'
  if (normalizedValue.includes('tarjeta')) return 'tarjeta'
  if (normalizedValue.includes('yoyo')) return 'yoyo'

  return ''
}

function getOrderCoreProductTypes(order) {
  const productValues = [
    order.product,
    ...(Array.isArray(order.items) ? order.items.map((item) => item.product) : []),
  ]

  return [...new Set(productValues.map(getCoreProductType).filter(Boolean))]
}

function hasActiveFilters(filters = {}) {
  return Object.values(filters).some((value) => normalizeText(value).length > 0)
}

function orderMatchesFilters(order, filters = {}) {
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

function getLanyardProgressPercentage(item) {
  const progress = item?.lanyardProgress
  const percentage = Number(progress?.percentage ?? progress?.progressPercentage ?? 0)

  return Number.isFinite(percentage) ? percentage : 0
}

function isItemReadyForDelivery(item) {
  if (isLanyardItem(item) && getLanyardProgressPercentage(item) < 100) {
    return false
  }

  return Array.isArray(item.subProcesses) &&
    item.subProcesses.length > 0 &&
    item.subProcesses.every((process) => process.status === 'done')
}

function sortOrdersForColumn(orders, column, filters) {
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

function MoveToProductionModal({ isOpen, onClose, onConfirm, order }) {
  const [pin, setPin] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !order) {
    return null
  }

  function resetFields() {
    setPin('')
    setComment('')
    setError('')
  }

  function handleClose() {
    if (isSubmitting) return

    resetFields()
    onClose()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return
    const trimmedPin = pin.trim()

    if (!/^\d{6}$/.test(trimmedPin)) {
      setError('Ingrese un PIN valido de 6 digitos.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onConfirm({
        pin: trimmedPin,
        comment: comment.trim(),
      })
      resetFields()
    } catch (submitError) {
      setError(submitError?.payload?.message ?? 'No fue posible mover la orden.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.operatorModalLayer} role="presentation">
      <form
        aria-labelledby="move-production-modal-title"
        className={styles.operatorModal}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <header className={styles.operatorModalHeader}>
          <div>
            <span className={styles.offcanvasKicker}>Validacion PIN</span>
            <h3 id="move-production-modal-title">Mover pedido</h3>
          </div>
          <button
            aria-label="Cerrar validacion"
            className={styles.offcanvasCloseButton}
            disabled={isSubmitting}
            onClick={handleClose}
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.operatorModalBody}>
          <p className={styles.operatorModalText}>Ingrese su PIN para hacer efectivo el traspaso del pedido {order.nv}.</p>
          <label>
            <span>PIN</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                setError('')
              }}
              placeholder="000000"
              type="password"
              value={pin}
            />
          </label>
          <label>
            <span>Comentario opcional</span>
            <textarea
              onChange={(event) => setComment(event.target.value)}
              placeholder="Agrega una observacion para produccion si corresponde."
              rows={3}
              value={comment}
            />
          </label>
          {error && <p className={styles.operatorModalError}>{error}</p>}
        </div>

        <footer className={styles.operatorModalFooter}>
          <button className={styles.resetFilterButton} disabled={isSubmitting} onClick={handleClose} type="button">
            Cancelar
          </button>
          <button className={styles.orderCardButton} disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Moviendo...' : 'Mover pedido'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function normalizeStatus(status) {
  const order = Number(status.orden_kanban)
  const column = baseColumns[order] ?? { accent: '#2563eb', icon: 'bi-kanban' }

  return {
    id: String(status.id_estado_pedido),
    title: status.nombre_etapa,
    generalStepId: order,
    order,
    accent: column.accent,
    icon: column.icon,
  }
}

function DroppableColumn({ id, accent, icon, count, children }) {
  const { ref } = useDroppable({ id })

  return (
    <section className={styles.column} ref={ref} style={{ '--kanban-accent': accent }}>
      <header className={styles.columnHeader}>
        <div className={styles.columnTitleGroup}>
          <i className={`bi ${icon}`} aria-hidden="true" />
          <h2>{id}</h2>
        </div>
        <span className={styles.columnCount}>{count}</span>
      </header>

      <div className={styles.columnBody}>{children}</div>
    </section>
  )
}

function KanbanColumn({ filters, refreshKey = 0 }) {
  const [orders, setOrders] = useState([])
  const [columns, setColumns] = useState(baseColumns)
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [moveError, setMoveError] = useState(null)
  const [pendingProductionMove, setPendingProductionMove] = useState(null)
  const kanbanApi = useKanbanApi()
  const { hasPermission } = useAuth()

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoadError(null)

        const [ordersResult, statusesResult] = await Promise.allSettled([
          kanbanApi.getOrders(),
          kanbanApi.getOrderStatuses(),
        ])

        if (ordersResult.status === 'fulfilled') {
          const normalizedOrders = Array.isArray(ordersResult.value)
            ? ordersResult.value
                .filter((order) => order?.numero_nota_venta ?? order?.nv ?? order?.codigo_nota_venta)
                .map(normalizeOrder)
                .filter((order) => !['terminado', 'cancelado'].includes(normalizeText(order.orderStatus)))
            : []
          setOrders(normalizedOrders)
        } else {
          console.error('Error cargando ordenes:', ordersResult.reason)
          setLoadError('No fue posible cargar las ordenes.')
        }

        if (statusesResult.status === 'fulfilled' && Array.isArray(statusesResult.value)) {
          const normalizedStatuses = statusesResult.value
            .map(normalizeStatus)
            .filter((status) => !['terminado', 'cancelado'].includes(normalizeText(status.title)))
            .sort((a, b) => a.order - b.order)

          setColumns(normalizedStatuses.length > 0 ? normalizedStatuses : baseColumns)
        } else {
          if (statusesResult.status === 'rejected') {
            console.warn('No fue posible cargar los estados del kanban:', statusesResult.reason)
          }
          setColumns(baseColumns)
        }
      } catch (error) {
        console.error('Error inesperado cargando kanban:', error)
        setLoadError('No fue posible cargar las ordenes.')
        setColumns(baseColumns)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [kanbanApi, refreshKey])

  async function applyOrderMove(order, targetColumn, audit = {}) {
    const patch = await kanbanApi.moveOrder(order.id, targetColumn.generalStepId, audit)
    setOrders((prevOrders) =>
      prevOrders.map((currentOrder) => applyOrderStagePatch(currentOrder, patch)),
    )
    setSelectedOrder((currentOrder) => applyOrderStagePatch(currentOrder, patch))
  }

  function handleDragEnd(event) {
    if (event.canceled || !hasPermission(PERMISSIONS.MOVE_ORDERS)) return

    const { source, target } = event.operation
    if (!source || !target) return

    const order = orders.find((currentOrder) => currentOrder.nv === source.id)
    const targetColumn = columns.find((column) => column.title === target.id)

    if (!order || !targetColumn || Number(order.generalStepId) === Number(targetColumn.generalStepId)) return

    const currentStep = Number(order.generalStepId)
    const targetStep = Number(targetColumn.generalStepId)
    if (!((currentStep === 1 && targetStep === 2) || (currentStep === 2 && targetStep === 3) || (currentStep === 3 && targetStep === 4))) {
      setMoveError('Esta transicion es automatica o no esta permitida.'); return
    }
    if (targetStep === 3 && (!order.items?.length || order.items.some((item) => !isItemReadyForDelivery(item)))) {
      setMoveError('Todos los detalles deben completar sus subprocesos y los lanyards deben llegar al 100% antes de pasar a Listo para Entrega.')
      return
    }
    const isForwardMove = targetStep > currentStep

    // Prechecks de UX; el backend vuelve a validar etapa, pago y permisos.
    if (targetStep < currentStep) {
      setMoveError(STAGE_BACKWARD_MESSAGE)
      return
    }

    if (targetStep !== currentStep + 1) {
      setMoveError(STAGE_SKIP_MESSAGE)
      return
    }

    if (isForwardMove && !isPaymentConfirmed(order)) {
      setMoveError('Debes confirmar el pago antes de mover esta orden.')
      return
    }

    if (isForwardMove && order.paymentDeconfirmationRequested) {
      setMoveError('Este pedido tiene una solicitud de desconfirmacion pendiente.')
      return
    }

    const isMoveToProduction = isForwardMove && targetStep === KANBAN_EN_PRODUCCION_STEP

    if (isMoveToProduction && !hasPermission(PERMISSIONS.MOVE_KANBAN_TO_PRODUCTION)) {
      setMoveError(MOVE_TO_PRODUCTION_PERMISSION_MESSAGE)
      return
    }

    setMoveError(null)

    setPendingProductionMove({ order, targetColumn })
  }

  function handleUpdateOrder(updatedOrder) {
    setOrders((prevOrders) =>
      prevOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
    )
    setSelectedOrder(updatedOrder)
  }

  async function handleToggleIndicator(orderId, indicator) {
    const order = orders.find((item) => item.id === orderId)
    if (!order) return
    const config = {
      urgent: ['Urgencia', !order.isUrgent],
      contractPriority: ['Prioridad por contrato', !order.hasContractPriority],
      producing: ['PRODUCIÉNDOSE', !order.isProducing],
    }[indicator]
    if (!config) return
    const optimisticPatch = {
      urgent: { isUrgent: config[1] },
      contractPriority: { hasContractPriority: config[1] },
      producing: { isProducing: config[1] },
    }[indicator]
    setOrders((current) => current.map((item) => item.id === orderId ? { ...item, ...optimisticPatch } : item))
    setSelectedOrder((current) => current?.id === orderId ? { ...current, ...optimisticPatch } : current)
    try {
      const result = await kanbanApi.setLabel(orderId, config[0], config[1])
      const updatedLabels = result.etiquetas ?? []
      const patchOrder = (current) => ({
        ...current,
        etiquetas: updatedLabels,
        isUrgent: hasOrderLabel({ etiquetas: updatedLabels }, ['Urgencia']),
        hasContractPriority: hasOrderLabel({ etiquetas: updatedLabels }, ['Prioridad por contrato']),
        isProducing: hasOrderLabel({ etiquetas: updatedLabels }, ['PRODUCIÉNDOSE', 'PRODUCIENDOSE']),
      })
      setOrders((current) => current.map((item) => item.id === orderId ? patchOrder(item) : item))
      setSelectedOrder((current) => current?.id === orderId ? patchOrder(current) : current)
    } catch (error) {
      setOrders((current) => current.map((item) => item.id === orderId ? order : item))
      setSelectedOrder((current) => current?.id === orderId ? order : current)
      setMoveError(error?.payload?.message ?? 'No fue posible actualizar la etiqueta.')
    }
  }

  async function confirmProductionMove(audit) {
    if (!pendingProductionMove) return

    const { order, targetColumn } = pendingProductionMove
    await applyOrderMove(order, targetColumn, audit)
    setPendingProductionMove(null)
  }

  async function handleCompleteSubprocess(order, item, process, payload) {
    try {
      const updatedOrder = await kanbanApi.completeSubprocess(order.id, item.id, process.id, payload)
      const normalizedOrder = normalizeOrder(updatedOrder)

      setOrders((prevOrders) =>
        prevOrders.map((currentOrder) => (currentOrder.id === normalizedOrder.id ? normalizedOrder : currentOrder)),
      )
      setSelectedOrder(normalizedOrder)
      return true
    } catch (error) {
      console.error('Error completando subproceso:', error)
      setMoveError(error?.payload?.message ?? 'No fue posible completar el subproceso.')
      return false
    }
  }

  async function handleSendToReview(order, comment) {
    try {
      const updatedOrder = await kanbanApi.sendToReview(order.id, comment)
      handleUpdateOrder(normalizeOrder(updatedOrder))
      return true
    } catch (error) {
      console.error('Error enviando pedido a revisión:', error)
      setMoveError(error?.payload?.message ?? 'No fue posible enviar el pedido a revisión.')
      return false
    }
  }

  async function handleCancelProduction(order, payload) {
    try {
      await kanbanApi.cancelProduction(order.id, payload)
      setOrders((currentOrders) => currentOrders.filter((item) => item.id !== order.id))
      setSelectedOrder(null)
      return true
    } catch (error) {
      console.error('Error cancelando la produccion:', error)
      setMoveError(error?.payload?.message ?? 'No fue posible cancelar la produccion.')
      return false
    }
  }

  async function handleRollbackSubprocess(order, item, process, payload) {
    try {
      const updated = await kanbanApi.rollbackSubprocess(order.id, item.id, process.id, payload)
      handleUpdateOrder(normalizeOrder(updated))
      return true
    } catch (error) {
      setMoveError(error?.payload?.message ?? 'No fue posible retroceder el subproceso.')
      return false
    }
  }

  async function handleReevaluate(order) {
    try {
      const updated = normalizeOrder(await kanbanApi.reevaluate(order.id))
      handleUpdateOrder(updated)
      return true
    } catch (error) {
      setMoveError(error?.payload?.message ?? 'No fue posible reevaluar el pedido.')
      return false
    }
  }

  return (
    <>
      {loadError && <div className={styles.kanbanError}>{loadError}</div>}
      <ToastContainer position="top-end" className="position-fixed p-3" style={{ zIndex: 1090 }}>
        <Toast show={Boolean(moveError)} onClose={() => setMoveError(null)} autohide delay={8000} role="alert" aria-live="assertive">
          <Toast.Header closeLabel="Cerrar notificación">
            <i className="bi bi-exclamation-triangle-fill text-warning me-2" aria-hidden="true" />
            <strong className="me-auto">No se pudo realizar la acción</strong>
          </Toast.Header>
          <Toast.Body>{moveError}</Toast.Body>
        </Toast>
      </ToastContainer>
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div className={styles.kanbanWrapper}>
          {columns.map((column) => {
            const columnOrders = sortOrdersForColumn(
              orders.filter(
                (order) => Number(column.generalStepId) === Number(order.generalStepId),
              ),
              column,
              filters,
            )

            return (
              <DroppableColumn
                accent={column.accent}
                count={columnOrders.length}
                icon={column.icon}
                id={column.title}
                key={column.title}
              >
                {loading && <div className={styles.emptyColumn}>Cargando ordenes...</div>}
                {!loading && columnOrders.length > 0
                  ? columnOrders.map((order) => (
                      <KanbanCard
                        isMoveBlocked={!isPaymentConfirmed(order)}
                        isCorrectionRequested={order.correctionRequested}
                        isPaymentDeconfirmationRequested={order.paymentDeconfirmationRequested}
                        isProducing={order.isProducing}
                        canMove={hasPermission(PERMISSIONS.MOVE_ORDERS) && (
                          [2, 3].includes(Number(order.generalStepId)) ||
                          (Number(order.generalStepId) === 1 && hasPermission(PERMISSIONS.START_PRODUCTION))
                        )}
                        canManageIndicators={hasPermission(PERMISSIONS.MANAGE_TAGS)}
                        key={order.id}
                        onOpenDetail={() => setSelectedOrder(order)}
                        onToggleIndicator={(indicator) => handleToggleIndicator(order.id, indicator)}
                        {...order}
                      />
                    ))
                  : !loading && <div className={styles.emptyColumn}>Arrastra una orden hacia esta columna.</div>}
              </DroppableColumn>
            )
          })}
        </div>
      </DragDropProvider>
      <KanbanOffCanvas
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        onCompleteSubprocess={handleCompleteSubprocess}
        canCompleteSubprocess={hasPermission(PERMISSIONS.UPDATE_SUBPROCESSES)}
        canReview={hasPermission(PERMISSIONS.REVIEW_ORDERS)}
        canRollbackSubprocess={hasPermission(PERMISSIONS.ROLLBACK_SUBPROCESSES)}
        canCancelProduction={hasPermission(PERMISSIONS.CANCEL_ORDERS)}
        canReevaluate={hasPermission(PERMISSIONS.REEVALUATE_ORDERS) && Number(selectedOrder?.generalStepId) === KANBAN_REVISION_STEP}
        onCancelProduction={handleCancelProduction}
        onRollbackSubprocess={handleRollbackSubprocess}
        onReevaluate={handleReevaluate}
        onSendToReview={handleSendToReview}
        onUpdateOrder={handleUpdateOrder}
        order={selectedOrder}
      />
      <MoveToProductionModal
        isOpen={Boolean(pendingProductionMove)}
        onClose={() => setPendingProductionMove(null)}
        onConfirm={confirmProductionMove}
        order={pendingProductionMove?.order}
      />
    </>
  )
}

export default KanbanColumn
