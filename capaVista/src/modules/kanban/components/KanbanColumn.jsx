import { useEffect, useRef, useState } from 'react'
import { DragDropProvider, useDroppable } from '@dnd-kit/react'
import { PERMISSIONS } from '../../../config/permissions'
import { useAuth } from '../../../hooks/useAuth'
import { useKanbanApi } from '../hooks/useKanbanApi'
import KanbanCard from './KanbanCard'
import KanbanOffCanvas from './KanbanOffCanvas'
import styles from '../styles/Kanban.module.css'

const MOVE_TO_PRODUCTION_PERMISSION_MESSAGE = 'Solo un administrador puede mover pedidos a En produccion.'
const STAGE_SKIP_MESSAGE = 'No puedes saltar etapas del pedido.'
const STAGE_BACKWARD_MESSAGE = 'No puedes retroceder en las etapas del pedido.'
const KANBAN_EN_PRODUCCION_STEP = 2
const LANYARD_DAILY_CAPACITY = 1200

const processTemplates = {
  lanyard: [
    { id: 'impresion', name: 'Impresion', status: 'pending' },
    { id: 'sublimacion', name: 'Sublimacion', status: 'pending' },
    { id: 'corte', name: 'Corte', status: 'pending' },
    { id: 'costura', name: 'Costura', status: 'pending' },
    { id: 'empaquetado', name: 'Empaquetado', status: 'pending' },
  ],
  tarjeta: [
    { id: 'revision-info', name: 'Revision info', status: 'pending' },
    { id: 'orden-info', name: 'Orden info', status: 'pending' },
    { id: 'carga-info', name: 'Carga info', status: 'pending' },
    { id: 'confeccion', name: 'Confeccion', status: 'pending' },
    { id: 'empaquetado', name: 'Empaquetado', status: 'pending' },
  ],
  default: [{ id: 'produccion-general', name: 'Produccion general', status: 'pending' }],
}

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
]

function getColumnTitleByStepId(stepId) {
  const column = baseColumns.find((item) => Number(item.generalStepId) === Number(stepId))
  return column?.title ?? 'Confirmacion de pago'
}

function getProcessesFor(productName) {
  const normalizedProductName = String(productName ?? '').toLowerCase()
  const key = normalizedProductName.includes('lanyard')
    ? 'lanyard'
    : normalizedProductName.includes('tarjeta')
      ? 'tarjeta'
      : 'default'
  const template = processTemplates[key]
  return template.map((step) => ({ ...step }))
}

function parseDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (!Number.isNaN(date.getTime())) {
    return date
  }

  const [day, month, year] = String(value).split('-').map(Number)
  const parsedDate = new Date(year, month - 1, day)

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function isOrderDelayed(dueDate) {
  const parsedDueDate = parseDate(dueDate)

  if (!parsedDueDate) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  parsedDueDate.setHours(0, 0, 0, 0)

  return parsedDueDate < today
}

function isOrderUrgent(dueDate) {
  const parsedDueDate = parseDate(dueDate)

  if (!parsedDueDate || isOrderDelayed(dueDate)) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysUntilDue = Math.ceil((parsedDueDate - today) / 86_400_000)

  return daysUntilDue <= 3
}

function isPaymentConfirmed(order) {
  return order.paymentStatus === 'Confirmado' || Number(order.paymentStatusId) === 2
}

function isLanyardOrder(order) {
  return String(order.product ?? '').toLowerCase().includes('lanyard')
}

function isLanyardItem(item) {
  return String(item.product ?? item.nombre_producto ?? '').toLowerCase().includes('lanyard')
}

function getQuantity(value) {
  const quantity = Number(value)

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0
}

function getOrderQuantity(order) {
  return getQuantity(order.quantity ?? order.cantidad)
}

function calculateOperationalLoad(orders) {
  const lanyardsInProduction = orders
    .filter((order) => Number(order.generalStepId) === KANBAN_EN_PRODUCCION_STEP)
    .reduce((total, order) => {
      if (Array.isArray(order.items) && order.items.length > 0) {
        return total + order.items
          .filter(isLanyardItem)
          .reduce((itemTotal, item) => itemTotal + getQuantity(item.quantity), 0)
      }

      return total + (isLanyardOrder(order) ? getOrderQuantity(order) : 0)
    }, 0)
  const percentage = Math.round((lanyardsInProduction / LANYARD_DAILY_CAPACITY) * 100)

  return {
    capacity: LANYARD_DAILY_CAPACITY,
    lanyardsInProduction,
    percentage,
  }
}

function createItemFromDetail(detail, index) {
  const product = detail.nombre_producto ?? detail.product ?? 'Producto no definido'

  return {
    id: String(detail.id_detalle_pedido ?? `${normalizeProcessName(product)}-${index}`),
    product,
    quantity: detail.cantidad ?? detail.quantity ?? null,
    dueDate: detail.fecha_estimada_termino ?? detail.dueDate ?? null,
    manufacturingDetails: detail.manufacturingDetails ?? null,
    subProcesses: Array.isArray(detail.subProcesses)
      ? detail.subProcesses
      : Array.isArray(detail.subprocesos)
        ? detail.subprocesos
        : getProcessesFor(product),
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
      subProcesses: Array.isArray(order.subProcesses)
        ? order.subProcesses
        : Array.isArray(order.subprocesos)
          ? order.subprocesos
          : getProcessesFor(product),
    })
  }

  if (Number(order.id ?? order.id_pedido) === 6 && items.length === 1 && isLanyardItem(items[0])) {
    items.push({
      id: `${order.id ?? order.id_pedido}-tarjeta-demo`,
      product: 'Tarjeta',
      quantity: 200,
      dueDate,
      manufacturingDetails: {
        width: '85.6 mm',
        length: '53.9 mm',
        cardType: 'Plastificada',
      },
      subProcesses: getProcessesFor('Tarjeta'),
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
    order.dueDate ??
    order.fecha_estimada_termino ??
    order.fecha_entrega ??
    order.fecha_compromiso ??
    ''

  const items = buildOrderItems(order, product, dueDate)

  return {
    id,
    clientName: order.clientName ?? order.cliente ?? order.nombre_cliente ?? 'Cliente sin nombre',
    seller: order.seller ?? order.vendedorResponsable ?? order.vendedor_responsable ?? '',
    nv: order.nv ?? order.codigo_nota_venta ?? order.codigo_nv ?? `PED-${id}`,
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
    isUrgent: Boolean(order.isUrgent ?? order.urgente ?? isOrderUrgent(dueDate)),
    hasContractPriority: Boolean(order.hasContractPriority ?? order.prioridad_contrato),
    quantity: order.quantity ?? order.cantidad ?? null,
    items,
    subProcesses: Array.isArray(order.subProcesses)
      ? order.subProcesses
      : Array.isArray(order.subprocesos)
        ? order.subprocesos
        : getProcessesFor(product),
    comments: Array.isArray(order.comments)
      ? order.comments
      : Array.isArray(order.comentarios)
        ? order.comentarios
        : [],
    correctionRequested: Boolean(order.correctionRequested),
    correctionComment: order.correctionComment ?? '',
    correctionRequestedAt: order.correctionRequestedAt ?? null,
    manufacturingDetails: order.manufacturingDetails ?? null,
  }
}

function getProductionPriority(order) {
  if (order.hasContractPriority) return 0
  if (order.isUrgent) return 1

  return 2
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

function hasActiveFilters(filters = {}) {
  return Object.values(filters).some((value) => normalizeText(value).length > 0)
}

function orderMatchesFilters(order, filters = {}) {
  const normalizedFilters = {
    clientName: normalizeText(filters.clientName),
    nv: normalizeText(filters.nv),
    op: normalizeText(filters.op),
    productType: normalizeText(filters.productType),
    seller: normalizeText(filters.seller),
  }

  if (!Object.values(normalizedFilters).some(Boolean)) return false

  const productValues = [
    order.product,
    ...(Array.isArray(order.items) ? order.items.map((item) => item.product) : []),
  ].map(normalizeText)
  const sellerValues = [
    order.seller,
    order.vendedorResponsable,
    order.vendedor_responsable,
    ...(Array.isArray(order.items)
      ? order.items.map((item) => item.seller ?? item.vendedorResponsable ?? item.vendedor_responsable)
      : []),
  ].map(normalizeText)
  const opValues = [order.opCode, order.productionDocuments?.opCode].map(normalizeText)

  if (normalizedFilters.clientName && !normalizeText(order.clientName).includes(normalizedFilters.clientName)) {
    return false
  }

  if (normalizedFilters.nv && !normalizeText(order.nv).includes(normalizedFilters.nv)) {
    return false
  }

  if (normalizedFilters.op && !opValues.some((value) => value.includes(normalizedFilters.op))) {
    return false
  }

  if (normalizedFilters.seller && !sellerValues.some((value) => value.includes(normalizedFilters.seller))) {
    return false
  }

  if (normalizedFilters.productType && !productValues.some((value) => value.includes(normalizedFilters.productType))) {
    return false
  }

  return true
}

function sortOrdersForColumn(orders, column, filters) {
  const activeFilters = hasActiveFilters(filters)
  const baseSortedOrders = Number(column.generalStepId) === KANBAN_EN_PRODUCCION_STEP
    ? [...orders].sort((left, right) => {
        const priorityDifference = getProductionPriority(left) - getProductionPriority(right)

        if (priorityDifference !== 0) return priorityDifference

        return compareOrderIds(left.id, right.id)
      })
    : orders

  if (!activeFilters) {
    return baseSortedOrders
  }

  return baseSortedOrders
    .map((order, index) => ({
      index,
      matchesFilters: orderMatchesFilters(order, filters),
      order,
    }))
    .sort((left, right) => {
      if (left.matchesFilters !== right.matchesFilters) {
        return left.matchesFilters ? -1 : 1
      }

      return left.index - right.index
    })
    .map(({ order }) => order)
}

function MoveToProductionModal({ isOpen, onClose, onConfirm, order }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !order) {
    return null
  }

  function resetFields() {
    setEmail('')
    setPassword('')
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
    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      setError('Ingrese correo y contrasena del usuario.')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Ingrese un correo valido.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onConfirm({
        operatorEmail: trimmedEmail,
        comment: comment.trim(),
      })
      resetFields()
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
            <span className={styles.offcanvasKicker}>Validacion administrador</span>
            <h3 id="move-production-modal-title">Mover a En produccion</h3>
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
          <p className={styles.operatorModalText}>Ingrese sus credenciales para hacer efectivo el traspaso de {order.clientName}.</p>
          <label>
            <span>Correo</span>
            <input
              autoComplete="email"
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
              placeholder="administrador@itecsa.cl"
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>Contrasena</span>
            <input
              autoComplete="current-password"
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              placeholder="Ingrese contrasena"
              type="password"
              value={password}
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

function KanbanColumn({ filters, onOperationalLoadChange }) {
  const movementCommentIdRef = useRef(0)
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
            ? ordersResult.value.map(normalizeOrder)
            : []
          setOrders(normalizedOrders)
        } else {
          console.error('Error cargando ordenes:', ordersResult.reason)
          setLoadError('No fue posible cargar las ordenes.')
        }

        if (statusesResult.status === 'fulfilled' && Array.isArray(statusesResult.value)) {
          const normalizedStatuses = statusesResult.value
            .map(normalizeStatus)
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
  }, [kanbanApi])

  useEffect(() => {
    onOperationalLoadChange?.(calculateOperationalLoad(orders))
  }, [onOperationalLoadChange, orders])

  function applyOrderMove(order, targetColumn, audit = {}) {
    const previousOrderStatus = order.orderStatus
    const previousStepId = order.generalStepId
    const nextComments = audit.comment
      ? [
          ...(Array.isArray(order.comments) ? order.comments : []),
          {
            id: `${order.id}-move-comment-${movementCommentIdRef.current}`,
            text: audit.comment,
          },
        ]
      : order.comments

    setOrders((prevOrders) =>
      prevOrders.map((currentOrder) =>
        currentOrder.id === order.id
          ? {
              ...currentOrder,
              orderStatus: targetColumn.title,
              generalStepId: targetColumn.generalStepId,
              comments: nextComments,
              productionMoveAudit: audit.operatorEmail
                ? {
                    operatorEmail: audit.operatorEmail,
                    movedAt: new Date().toISOString(),
                  }
                : currentOrder.productionMoveAudit,
            }
          : currentOrder,
      ),
    )

    return kanbanApi.moveOrder(order.id, targetColumn.generalStepId).catch((error) => {
      console.error('Error moviendo orden:', error)
      setMoveError(error?.payload?.message ?? 'No fue posible mover la orden.')
      setOrders((prevOrders) =>
        prevOrders.map((currentOrder) =>
          currentOrder.id === order.id && Number(currentOrder.generalStepId) === Number(targetColumn.generalStepId)
            ? {
                ...currentOrder,
                orderStatus: previousOrderStatus,
                generalStepId: previousStepId,
                comments: order.comments,
                productionMoveAudit: order.productionMoveAudit,
              }
            : currentOrder,
        ),
      )
    })
  }

  function handleDragEnd(event) {
    if (event.canceled) return

    const { source, target } = event.operation
    if (!source || !target) return

    const order = orders.find((currentOrder) => currentOrder.nv === source.id)
    const targetColumn = columns.find((column) => column.title === target.id)

    if (!order || !targetColumn || Number(order.generalStepId) === Number(targetColumn.generalStepId)) return

    const currentStep = Number(order.generalStepId)
    const targetStep = Number(targetColumn.generalStepId)
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

    const isMoveToProduction =
      isForwardMove && targetStep === KANBAN_EN_PRODUCCION_STEP

    if (isMoveToProduction && !hasPermission(PERMISSIONS.MOVE_KANBAN_TO_PRODUCTION)) {
      setMoveError(MOVE_TO_PRODUCTION_PERMISSION_MESSAGE)
      return
    }

    setMoveError(null)

    if (isMoveToProduction) {
      setPendingProductionMove({ order, targetColumn })
      return
    }

    applyOrderMove(order, targetColumn)
  }

  function handleUpdateOrder(updatedOrder) {
    setOrders((prevOrders) =>
      prevOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
    )
    setSelectedOrder(updatedOrder)
  }

  function handleToggleIndicator(orderId, indicator) {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== orderId) return order

        if (indicator === 'urgent') {
          return { ...order, isUrgent: !order.isUrgent }
        }

        if (indicator === 'contractPriority') {
          return { ...order, hasContractPriority: !order.hasContractPriority }
        }

        return order
      }),
    )
  }

  async function confirmProductionMove(audit) {
    if (!pendingProductionMove) return

    movementCommentIdRef.current += 1
    const { order, targetColumn } = pendingProductionMove
    setPendingProductionMove(null)
    await applyOrderMove(order, targetColumn, audit)
  }

  return (
    <>
      {loadError && <div className={styles.kanbanError}>{loadError}</div>}
      {moveError && <div className={styles.kanbanError}>{moveError}</div>}
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
                        canManageIndicators={hasPermission(PERMISSIONS.MOVE_KANBAN_TO_PRODUCTION)}
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
