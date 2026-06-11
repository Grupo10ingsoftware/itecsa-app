import { useState } from 'react'
import { DragDropProvider, useDroppable } from '@dnd-kit/react'
import KanbanCard from './KanbanCard'
import styles from '../styles/Kanban.module.css'
import KanbanOffCanvas from './KanbanOffCanvas';

const processTemplates = {
  'Lanyards': [
    { id: 'imp', name: 'Impresión', status: 'pending' },
    { id: 'sub', name: 'Sublimación', status: 'pending' },
    { id: 'cor', name: 'Corte', status: 'pending' },
    { id: 'cos', name: 'Costura', status: 'pending' }
  ],
  'Tarjeta': [
    { id: 'rev', name: 'Revisar información', status: 'pending' },
    { id: 'ord', name: 'Ordenar información', status: 'pending' },
    { id: 'car', name: 'Cargar datos', status: 'pending' }
  ],
  'default': [
    { id: 'gen', name: 'Producción General', status: 'pending' }
  ]
};

const getProcessesFor = (productName) => {
  const template = processTemplates[productName] || processTemplates['default'];
  return template.map(step => ({ ...step })); 
};

const initialOrders = [
  {
    id: 1,
    clientName: 'Colegio Andes',
    nv: 'NV-6767',
    product: 'Lanyards',
    date: '21-05-2026',
    dueDate: '21-06-2026',
    isUrgent: true,
    isDelayed: false,
    paymentStatus: '',
    orderStatus: 'Listo para producción',
    subProcesses: getProcessesFor('Lanyards'), 
    comments: []
  },
  {
    id: 2,
    clientName: 'Chile',
    nv: 'NV-6768',
    product: 'Tarjeta',
    date: '21-05-2026',
    dueDate: '21-06-2026',
    isUrgent: false,
    isDelayed: true,
    paymentStatus: '',
    orderStatus: 'En producción',
    subProcesses: getProcessesFor('Tarjeta'), 
    comments: []
  },
  {
    id: 3,
    clientName: 'Bulla de mi vida',
    nv: 'NV-6769',
    product: 'Lanyards',
    date: '21-05-2026',
    dueDate: '21-05-2026',
    isUrgent: false,
    isDelayed: false,
    paymentStatus: '',
    orderStatus: 'Confirmación de pago',
    subProcesses: getProcessesFor('Lanyards'), 
    comments: []
  },
  {
    id: 4,
    clientName: 'Bulla de mi amor',
    nv: 'NV-6779',
    product: 'Lanyards',
    date: '21-05-2026',
    dueDate: '21-06-2026',
    isUrgent: false,
    isDelayed: false,
    paymentStatus: '',
    orderStatus: 'Listo para entrega',
    subProcesses: getProcessesFor('Lanyards'),
    comments: []
  },
  {
    id: 5,
    clientName: 'Puro sentimiento',
    nv: 'NV-6777',
    product: 'Lanyards',
    date: '21-05-2026',
    dueDate: '21-06-2026',
    isUrgent: false,
    isDelayed: false,
    paymentStatus: '',
    orderStatus: 'Listo para entrega',
    subProcesses: getProcessesFor('Lanyards'),
    comments: []
  },
]

const columns = [
  {
    title: 'Confirmación de pago',
    accent: '#f97316',
    icon: 'bi-cash-coin',
  },
  {
    title: 'Listo para producción',
    accent: '#2563eb',
    icon: 'bi-clipboard-check',
  },
  {
    title: 'En producción',
    accent: '#d97706',
    icon: 'bi-gear-wide-connected',
  },
  {
    title: 'Listo para entrega',
    accent: '#248f55',
    icon: 'bi-check2-circle',
  },
]

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
  const [orders, setOrders] = useState(initialOrders)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const handleUpdateOrder = (updatedOrder) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
    setSelectedOrder(updatedOrder);
  };

  function handleDragEnd(event) {
    if (event.canceled) return

    const { source, target } = event.operation
    if (!source || !target) return

    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.nv === source.id ? { ...order, orderStatus: target.id } : order,
      ),
    )
  }

  return (
    <>
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div className={styles.kanbanWrapper}>
            {columns.map((column) => {
              const columnOrders = orders.filter((order) => column.title === order.orderStatus)

              return (
                <DroppableColumn
                  accent={column.accent}
                  count={columnOrders.length}
                  icon={column.icon}
                  id={column.title}
                  key={column.title}
                >
                  {columnOrders.length > 0 ? (
                    columnOrders.map((order) => (
                      <KanbanCard 
                        key={order.id} 
                        {...order} 
                        onOpenDetail={() => setSelectedOrder(order)} 
                      />
                    ))
                  ) : (
                    <div className={styles.emptyColumn}>Arrastra una orden hacia esta columna.</div>
                  )}
                </DroppableColumn>
              )
            })}
          </div>
        </DragDropProvider>
        <KanbanOffCanvas
            isOpen={selectedOrder !== null}
            onClose={() => setSelectedOrder(null)}
            order={selectedOrder}
            onUpdateOrder={handleUpdateOrder}
        />
    </>

      
  )

  function handleDragEnd(event) {
    if (event.canceled) return

    const { source, target } = event.operation
    if (!source || !target) return

    const orderToMove = orders.find(order => order.nv === source.id)
    
    if (!orderToMove || orderToMove.orderStatus === target.id) return

    const message = `¿Confirmas mover el pedido ${orderToMove.nv} a "${target.id}"?`;
    const isConfirmed = window.confirm(message);
    
    if (!isConfirmed) return

    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.nv === source.id ? { ...order, orderStatus: target.id } : order,
      ),
    )
  }
}

export default KanbanColumn