import { useEffect, useState } from 'react'
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

function getOrderQuantity(order) {
  const quantity = Number(order.quantity ?? order.cantidad)

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0
}

function calculateOperationalLoad(orders) {
  const lanyardsInProduction = orders
    .filter((order) => Number(order.generalStepId) === KANBAN_EN_PRODUCCION_STEP && isLanyardOrder(order))
    .reduce((total, order) => total + getOrderQuantity(order), 0)
  const percentage = Math.round((lanyardsInProduction / LANYARD_DAILY_CAPACITY) * 100)

  return {
    capacity: LANYARD_DAILY_CAPACITY,
    lanyardsInProduction,
    percentage,
  }
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

  return {
    id,
    clientName: order.clientName ?? order.cliente ?? order.nombre_cliente ?? 'Cliente sin nombre',
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
    quantity: order.quantity ?? order.cantidad ?? null,
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

function KanbanColumn({ onOperationalLoadChange }) {
  const [orders, setOrders] = useState([])
  const [columns, setColumns] = useState(baseColumns)
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [moveError, setMoveError] = useState(null)
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

    if (!window.confirm(`Mover ${order.nv} a "${targetColumn.title}"?`)) {
      return
    }

    const previousOrderStatus = order.orderStatus
    const previousStepId = order.generalStepId

    setOrders((prevOrders) =>
      prevOrders.map((currentOrder) =>
        currentOrder.nv === source.id
          ? { ...currentOrder, orderStatus: targetColumn.title, generalStepId: targetColumn.generalStepId }
          : currentOrder,
      ),
    )

    kanbanApi.moveOrder(order.id, targetColumn.generalStepId).catch((error) => {
      console.error('Error moviendo orden:', error)
      setMoveError(error?.payload?.message ?? 'No fue posible mover la orden.')
      setOrders((prevOrders) =>
        prevOrders.map((currentOrder) =>
          currentOrder.id === order.id && Number(currentOrder.generalStepId) === Number(targetColumn.generalStepId)
            ? {
                ...currentOrder,
                orderStatus: previousOrderStatus,
                generalStepId: previousStepId,
              }
            : currentOrder,
        ),
      )
    })
  }

  function handleUpdateOrder(updatedOrder) {
    setOrders((prevOrders) =>
      prevOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
    )
    setSelectedOrder(updatedOrder)
  }

  return (
    <>
      {loadError && <div className={styles.kanbanError}>{loadError}</div>}
      {moveError && <div className={styles.kanbanError}>{moveError}</div>}
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div className={styles.kanbanWrapper}>
          {columns.map((column) => {
            const columnOrders = orders.filter(
              (order) => Number(column.generalStepId) === Number(order.generalStepId),
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
                        key={order.id}
                        onOpenDetail={() => setSelectedOrder(order)}
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
    </>
  )
}

export default KanbanColumn
