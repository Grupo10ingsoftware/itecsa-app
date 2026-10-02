import { getProductSummary, getOrderToneClass, formatScheduleState } from '../utils/calendarPresentation.js';
import { useAuth } from '../../../hooks/useAuth';
import styles from './ProductionCalendarGrid.module.css';
import { PERMISSIONS } from '../../../config/permissions';

export function CalendarEvent({ isDragging, item, onDragEnd, onDragStart, onOpenDetail }) {
  const { hasPermission } = useAuth()
  const productSummary = getProductSummary(item)

  return (
    <button
      className={[styles.calendarEvent, getOrderToneClass(item), isDragging ? styles.draggingEvent : '']
        .filter(Boolean)
        .join(' ')}
      draggable={hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)}
      onDragEnd={onDragEnd}
      onDoubleClick={() => onOpenDetail(item)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', item.id)
        onDragStart(item.id)
      }}
      title="Arrastrar para cambiar fecha de entrega"
      type="button"
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
        <em>{productSummary}</em>
      </span>
      <span className={styles.eventLine}>
        <b>Etapa:</b>
        <small>{formatScheduleState(item)}</small>
      </span>
    </button>
  )
}
