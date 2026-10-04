import { formatDayTitle, getOrderToneClass } from '../utils/calendarPresentation.js';
import { useAuth } from '../../../hooks/useAuth';
import styles from './ProductionCalendarGrid.module.css';
import { PERMISSIONS } from '../../../config/permissions';

export function DayOrdersModal({ dateKey, draggedItemId, items, onClose, onDragEnd, onDragStart, onOpenDetail }) {
  const { hasPermission } = useAuth()
  if (!dateKey) return null

  function handleModalItemDragStart(event, itemId) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemId)
    onDragStart(itemId)
    setTimeout(onClose, 0)
  }

  return (
    <div className={styles.modalLayer} onMouseDown={onClose} role="presentation">
      <section
        aria-labelledby="day-orders-modal-title"
        aria-modal="true"
        className={styles.modalCard}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className={styles.modalHeader}>
          <div>
            <span>Entregas del dia</span>
            <h2 id="day-orders-modal-title">{formatDayTitle(dateKey)}</h2>
          </div>
          <button aria-label="Cerrar modal" onClick={onClose} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          {items.map((item) => (
            <article
              className={[
                styles.dayOrderRow,
                styles.draggableDayOrderRow,
                getOrderToneClass(item),
                draggedItemId === item.id ? styles.draggingEvent : '',
              ]
                .filter(Boolean)
                .join(' ')}
              draggable={hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)}
              key={item.id}
              onDragEnd={onDragEnd}
              onDoubleClick={() => onOpenDetail(item)}
              onDragStart={(event) => handleModalItemDragStart(event, item.id)}
              title="Arrastrar para cambiar fecha de entrega"
            >
              <div>
                <strong>{item.orderNumber}</strong>
                <span>{item.clientName}</span>
              </div>
              <dl>
                <div>
                  <dt>Producto</dt>
                  <dd>{item.productType}</dd>
                </div>
                <div>
                  <dt>Cantidad</dt>
                  <dd>{item.quantity ?? 'No definida'}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{item.status}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
