import styles from '../styles/Kanban.module.css'
import { useDraggable } from '@dnd-kit/react'

function KanbanCard({
  clientName,
  nv,
  product,
  date,
  dueDate,
  isDelayed,
  isMoveBlocked,
  isUrgent,
  onOpenDetail,
}) {
  const { ref } = useDraggable({
    id: nv,
    disabled: isMoveBlocked,
  })

  return (
    <article className={`${styles.orderCard} ${isMoveBlocked ? styles.orderCardBlocked : ''}`} ref={ref}>
      <div className={styles.orderCardHeader}>
        <span className={styles.orderClient}>{clientName}</span>
        <div className={styles.headerBadgesGroup}>
          {isMoveBlocked && (
            <span className={styles.lockedBadge} title="Pago pendiente">
              <i className="bi bi-lock-fill" aria-hidden="true" />
            </span>
          )}
          {isDelayed && (
            <span className={styles.delayBadge} title="Pedido atrasado">
              <i className="bi bi-clock-fill" aria-hidden="true" />
            </span>
          )}
          {isUrgent && (
            <span className={styles.urgentBadge} title="Pedido urgente">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
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
        {dueDate && (
          <div>
            <dt>Entrega</dt>
            <dd>{dueDate}</dd>
          </div>
        )}
      </dl>

      <button
        className={styles.orderCardButton}
        onClick={(event) => {
          event.stopPropagation()
          onOpenDetail?.()
        }}
        type="button"
      >
        <i className="bi bi-eye" aria-hidden="true" />
        <span>Detalle</span>
      </button>
    </article>
  )
}

export default KanbanCard
