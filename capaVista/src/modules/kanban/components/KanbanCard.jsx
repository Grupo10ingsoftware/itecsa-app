import styles from '../styles/Kanban.module.css'
import { useDraggable } from '@dnd-kit/react'

function KanbanCard({ clientName, nv, product, date, onOpenDetail }) {
  const { ref } = useDraggable({
    id: nv,
  })

  return (
    <article className={styles.orderCard} ref={ref}>
      <div className={styles.orderCardHeader}>
        <span className={styles.orderClient}>{clientName}</span>
        <span className={styles.orderNv}>{nv}</span>
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

      <button className={`${styles['orderCardButton']}`}
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
