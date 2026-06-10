import styles from '../styles/Kanban.module.css'
import { useDraggable } from '@dnd-kit/react'

function KanbanCard({ clientName, nv, product, date, onOpenDetail, isUrgent, dueDate, isDelayed, orderStatus }) {
  const isDraggingDisabled = orderStatus === 'Confirmación de pago';
  const { ref } = useDraggable({
    id: nv,
    disabled: isDraggingDisabled
  })

  return (
    <article className={`${styles.orderCard} ${isDraggingDisabled ? styles.nonDisabled : ''} `} 
    ref={ref}>
      <div className={styles.orderCardHeader}>
        <span className={styles.orderClient}>{clientName}</span>
        
        <div className={styles.headerBadgesGroup}>
          
          {isDelayed && (
            <span className={styles.delayBadge} title="Pedido Atrasado">
              <i className="bi bi-clock-fill" aria-hidden="true"></i>
            </span>
          )}

          {isUrgent && (
            <span className={styles.urgentBadge} title="Pedido Urgente">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
            </span>
          )}

          <span className={styles.orderNv}>{nv}</span>
        </div>

      </div>

      <dl className={styles.orderDetails}>
        <div>
          <dt>Producto</dt>
          <dd>{product}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{date}</dd>
        </div>
      </dl>

      <button className={styles.orderCardButton}
          onClick={(e) => {
              e.stopPropagation();
              onOpenDetail();
          }}
      >
        <i className="bi bi-eye" aria-hidden="true" />
        <span>Detalle</span>
      </button>
    </article>
  )
}

export default KanbanCard