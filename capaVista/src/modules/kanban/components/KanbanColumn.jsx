import { useState, useEffect } from 'react'
import { DragDropProvider, useDroppable } from '@dnd-kit/react'
import { useKanbanApi } from '../hooks/useKanbanApi'
import KanbanCard from './KanbanCard'
import styles from '../styles/Kanban.module.css'

// const initialOrders = [
//   {
//     id: 1,
//     clientName: 'Colegio Andes',
//     nv: 'NV-6767',
//     product: 'Lanyards',
//     date: '21-05-2026',
//     paymentStatus: '',
//     orderStatus: 'Listo para producción',
//   },
//   {
//     id: 2,
//     clientName: 'Chile',
//     nv: 'NV-6768',
//     product: 'Lanyards',
//     date: '21-05-2026',
//     paymentStatus: '',
//     orderStatus: 'En producción',
//   },
//   {
//     id: 3,
//     clientName: 'Bulla de mi vida',
//     nv: 'NV-6769',
//     product: 'Lanyards',
//     date: '21-05-2026',
//     paymentStatus: '',
//     orderStatus: 'Confirmación de pago',
//   },
//   {
//     id: 4,
//     clientName: 'Bulla de mi amor',
//     nv: 'NV-6779',
//     product: 'Lanyards',
//     date: '21-05-2026',
//     paymentStatus: '',
//     orderStatus: 'Listo para entrega',
//   },
//   {
//     id: 5,
//     clientName: 'Puro sentimiento',
//     nv: 'NV-6777',
//     product: 'Lanyards',
//     date: '21-05-2026',
//     paymentStatus: '',
//     orderStatus: 'Listo para entrega',
//   },
// ]


function getColumnTitleByStepId(stepId) {
  const column = columnVisuals.find((item) => Number(item.generalStepId) === Number(stepId))
  return column?.title ?? 'Confirmación de pago'
}

function normalizeOrder(order) {
  const id = order.id ?? order.id_pedido

  return {
    id,
    clientName: order.clientName ?? order.cliente ?? order.nombre_cliente ?? 'Cliente sin nombre',
    nv: order.nv ?? order.codigo_nota_venta ?? order.codigo_nv ?? `PED-${id}`,
    product: order.product ?? order.producto ?? order.nombre_producto ?? 'Producto no definido',
    date: order.date ?? order.fecha ?? order.fecha_pedido ?? '',
    paymentStatus: order.paymentStatus ?? order.estado_pago ?? '',
    orderStatus:
      order.orderStatus ??
      order.etapa_general ??
      order.nombre_etapa_general ??
      getColumnTitleByStepId(order.id_etapa_general),
    generalStepId: order.generalStepId ?? order.id_etapa_general,
  }
}

const columnVisuals = [
  { accent: '#f97316', icon: 'bi-cash-coin' },
  { accent: '#2563eb', icon: 'bi-clipboard-check' },
  { accent: '#d97706', icon: 'bi-gear-wide-connected' },
  { accent: '#248f55', icon: 'bi-check2-circle' },
]

function normalizeStatus(status) {
  const order = Number(status.orden_kanban)
  const visual = columnVisuals[order] ?? { accent: '#2563eb', icon: 'bi-kanban' }

  return {
    id: String(status.id_estado_pedido),
    title: status.nombre_etapa,
    generalStepId: order,
    order,
    accent: visual.accent,
    icon: visual.icon,
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
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const kanbanApi = useKanbanApi()

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const [ordersData, statusesData] = await Promise.all([
          kanbanApi.getOrders(),
          kanbanApi.getOrderStatuses(),
        ])
        

        const normalizedOrders = Array.isArray(ordersData) ? ordersData.map(normalizeOrder) : []
        setColumns(
          Array.isArray(statusesData)
          ? statusesData.map(normalizeStatus).sort((a, b) => a.order - b.order)
          : []
        )
        setOrders(normalizedOrders)


      } catch (error) {
        console.error('Error cargando órdenes:', error)
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

    const previousOrderStatus = order.orderStatus
    const previousStepId = order.generalStepId

    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.nv === source.id
          ? { ...order, generalStepId: targetColumn.generalStepId, orderStatus: targetColumn.title }
          : order,
      ),
    )

    kanbanApi.moveOrder(order.id, targetColumn.generalStepId)
      .catch((error) => {
        console.error('Error moviendo orden:', error)
        setOrders((prevOrders) =>
          prevOrders.map((currentOrder) =>
            currentOrder.id === order.id && currentOrder.orderStatus === targetColumn.title
              ? { ...currentOrder, generalStepId: previousStepId, orderStatus: previousOrderStatus }
              : currentOrder,
          ),
        )
      })
  }

  return (
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
              {columnOrders.length > 0 ? (
                columnOrders.map((order) => <KanbanCard key={order.id} {...order} />)
              ) : (
                <div className={styles.emptyColumn}>Arrastra una orden hacia esta columna.</div>
              )}
            </DroppableColumn>
          )
        })}
      </div>
    </DragDropProvider>
  )
}

export default KanbanColumn
