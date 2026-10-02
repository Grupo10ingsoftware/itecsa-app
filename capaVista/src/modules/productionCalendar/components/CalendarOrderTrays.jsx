import { getOrderToneClass, getProductSummary, formatScheduleState, displayValue } from '../utils/calendarPresentation.js';
import { useAuth } from '../../../hooks/useAuth';
import styles from './ProductionCalendarGrid.module.css';
import { PERMISSIONS } from '../../../config/permissions';

export function PendingOrdersTray({ draggedItemId, items, onDragEnd, onDragStart, onOpenDetail }) {
  const { hasPermission } = useAuth()

  function handleDragStart(event, itemId) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemId)
    onDragStart(itemId)
  }

  return (
    <aside className={styles.pendingTray} aria-label="Pedidos pendientes de programar">
      <header className={styles.pendingTrayHeader}>
        <div>
          <span>Produccion</span>
          <h2>Pendientes de programar</h2>
        </div>
        <strong>{items.length}</strong>
      </header>

      <div className={styles.pendingTrayBody}>
        {items.length === 0 ? (
          <p className={styles.emptyPendingState}>No hay pedidos pendientes de fecha.</p>
        ) : items.map((item) => (
          <article
            className={[
              styles.pendingOrderCard,
              getOrderToneClass(item),
              draggedItemId === item.id ? styles.draggingEvent : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable={hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)}
            key={item.id}
            onDragEnd={onDragEnd}
            onDoubleClick={() => onOpenDetail(item)}
            onDragStart={(event) => handleDragStart(event, item.id)}
            title="Doble click para ver detalle. Arrastrar a un dia habil del calendario"
          >
            <span className={styles.eventLine}>
              <b>Pedido N°:</b>
              <strong>{item.orderNumber}</strong>
            </span>
            <span className={styles.eventLine}>
              <b>Cliente:</b>
              <span>{item.clientName}</span>
            </span>
            <span className={styles.eventLine}>
              <b>Productos:</b>
              <em>{getProductSummary(item)}</em>
            </span>
            <span className={styles.eventLine}>
              <b>Etapa:</b>
              <small>{formatScheduleState(item)}</small>
            </span>
          </article>
        ))}
      </div>
    </aside>
  )
}

export function TransferOrdersTray({ draggedItemId, items, onDragEnd, onDragStart, onDropTransferItem, onOpenDetail }) {
  const { hasPermission } = useAuth()
  const canReceiveTransfer = hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)

  function handleDragStart(event, itemId) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemId)
    onDragStart(itemId)
  }

  function handleDragOver(event) {
    if (!canReceiveTransfer || !draggedItemId) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(event) {
    if (!canReceiveTransfer) return

    event.preventDefault()
    const itemId = event.dataTransfer.getData('text/plain')
    onDropTransferItem(itemId)
  }

  return (
    <aside
      className={[styles.transferTray, draggedItemId ? styles.transferTrayActive : '']
        .filter(Boolean)
        .join(' ')}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-label="Bandeja temporal para mover pedidos de mes"
    >
      <header className={styles.transferTrayHeader}>
        <div>
          <span>Produccion</span>
          <h2>Bandeja para mover pedidos</h2>
        </div>
        <strong>{items.length}</strong>
      </header>

      <div className={styles.transferTrayBody}>
        {items.length === 0 ? (
          <p className={styles.emptyTransferState}>Arrastra aqui los pedidos que quieras mover a otro mes.</p>
        ) : items.map((item) => (
          <article
            className={[
              styles.transferOrderCard,
              getOrderToneClass(item),
              draggedItemId === item.id ? styles.draggingEvent : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable={canReceiveTransfer}
            key={item.id}
            onDragEnd={onDragEnd}
            onDoubleClick={() => onOpenDetail(item)}
            onDragStart={(event) => handleDragStart(event, item.id)}
            title="Arrastrar a un dia habil del calendario"
          >
            <span className={styles.eventLine}>
              <b>Pedido NÂ°:</b>
              <strong>{item.orderNumber}</strong>
            </span>
            <span className={styles.eventLine}>
              <b>Cliente:</b>
              <span>{item.clientName}</span>
            </span>
            <span className={styles.eventLine}>
              <b>Productos:</b>
              <em>{getProductSummary(item)}</em>
            </span>
            <span className={styles.eventLine}>
              <b>Fecha actual:</b>
              <small>{displayValue(item.dueDate, 'Sin fecha')}</small>
            </span>
          </article>
        ))}
      </div>
    </aside>
  )
}
