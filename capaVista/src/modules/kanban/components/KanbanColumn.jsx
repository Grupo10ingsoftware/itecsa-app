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

function normalizeSubprocess(subprocess) {
  const id = subprocess.id_estado_subproceso ?? subprocess.id

  return {
    id,
    name: subprocess.nombre_estado ?? subprocess.name ?? 'Subproceso',
    description: subprocess.descripcion_estado ?? subprocess.description ?? '',
    order: subprocess.orden_flujo ?? subprocess.order ?? null,
    status: subprocess.status ?? 'locked',
    completedAt: subprocess.fecha_hora_salida ?? subprocess.completedAt ?? null,
    operatorEmail:
      subprocess.usuario?.correo_usuario ??
      subprocess.operatorEmail ??
      '',
    operatorName:
      [
        subprocess.usuario?.nombre_usuario,
        subprocess.usuario?.apellido_usuario,
      ]
        .filter(Boolean)
        .join(' ') || '',
  }
}

function normalizeComment(comment, fallbackIdPrefix) {
  return {
    id: comment.id_comentario_produccion ?? comment.id ?? `${fallbackIdPrefix}-${Date.now()}`,
    text: comment.comentario ?? comment.text ?? '',
    createdAt: comment.fecha_comentario ?? comment.createdAt ?? null,
    operatorEmail: comment.usuario?.correo_usuario ?? comment.operatorEmail ?? '',
  }
}

function createItemFromDetail(detail, index) {
  const product = detail.nombre_producto ?? detail.product ?? 'Producto no definido'

  return {
    id: String(detail.id_detalle_pedido ?? detail.id ?? index),
    detailId: detail.id_detalle_pedido ?? detail.detailId ?? detail.id,
    product,
    description: detail.descripcion_producto ?? detail.description ?? '',
    quantity: detail.cantidad ?? detail.quantity ?? null,
    dueDate: detail.fecha_estimada_termino ?? detail.dueDate ?? null,
    completedAt: detail.fecha_real_termino ?? detail.completedAt ?? null,
    subProcesses: Array.isArray(detail.subprocesos)
      ? detail.subprocesos.map(normalizeSubprocess)
      : Array.isArray(detail.subProcesses)
        ? detail.subProcesses.map(normalizeSubprocess)
        : [],
    comments: Array.isArray(detail.comentarios)
      ? detail.comentarios.map((comment) => normalizeComment(comment, detail.id_detalle_pedido ?? index))
      : [],
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
  const items = Array.isArray(order.detalles)
    ? order.detalles.map(createItemFromDetail)
    : Array.isArray(order.items)
      ? order.items.map(createItemFromDetail)
      : []
  const comments = [
    ...(Array.isArray(order.comments)
      ? order.comments.map((comment) => normalizeComment(comment, id))
      : []),
    ...items.flatMap((item) => item.comments),
  ]

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
    items,
    subProcesses: items[0]?.subProcesses ?? [],
    comments,
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

function KanbanColumn() {
  const [orders, setOrders] = useState([])
  const [columns, setColumns] = useState(baseColumns)
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
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

  async function loadOrderDetail(order) {
    if (!order?.id) return

    setSelectedOrder(order)
    setDetailLoading(true)
    setDetailError(null)

    try {
      const orderDetail = await kanbanApi.getOrder(order.id)
      const normalizedOrder = normalizeOrder(orderDetail)

      setOrders((prevOrders) =>
        prevOrders.map((currentOrder) =>
          currentOrder.id === normalizedOrder.id
            ? { ...currentOrder, ...normalizedOrder }
            : currentOrder,
        ),
      )
      setSelectedOrder(normalizedOrder)
    } catch (error) {
      console.error('Error cargando detalle de orden:', error)
      setDetailError(error?.payload?.message ?? 'No fue posible cargar el detalle del pedido.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleCompleteSubprocess({ detailId, subprocessId, comment }) {
    if (!selectedOrder?.id) return false

    try {
      await kanbanApi.completeSubprocess(detailId, subprocessId, { comment })
      await loadOrderDetail(selectedOrder)
      return true
    } catch (error) {
      console.error('Error completando subproceso:', error)
      setDetailError(error?.payload?.message ?? 'No fue posible completar el subproceso.')
      return false
    }
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
                        key={order.id}
                        onOpenDetail={() => loadOrderDetail(order)}
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
        error={detailError}
        isOpen={selectedOrder !== null}
        isLoading={detailLoading}
        onClose={() => setSelectedOrder(null)}
        onCompleteSubprocess={handleCompleteSubprocess}
        order={selectedOrder}
      />
    </>
  )
}

export default KanbanColumn
