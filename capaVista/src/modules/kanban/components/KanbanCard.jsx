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
  isCorrectionRequested,
  isUrgent,
  hasContractPriority,
  canManageIndicators,
  onToggleIndicator,
  onOpenDetail,
}) {
  const { ref } = useDraggable({
    id: nv,
    disabled: isMoveBlocked,
  })

  return (
    <article
      className={[
        styles.orderCard,
        isMoveBlocked ? styles.orderCardBlocked : '',
        isCorrectionRequested ? styles.orderCardCorrection : '',
        isUrgent ? styles.orderCardUrgent : '',
        hasContractPriority ? styles.orderCardContractPriority : '',
      ]
        .filter(Boolean)
        .join(' ')}
      ref={ref}
    >
      <div className={styles.orderCardHeader}>
        <span className={styles.orderClient}>{clientName}</span>
        <div className={styles.headerBadgesGroup}>
          {isMoveBlocked && (
            <span className={styles.lockedBadge} title="Pago pendiente">
              <i className="bi bi-lock-fill" aria-hidden="true" />
            </span>
          )}
          <span className={`${styles.delayBadge} ${isDelayed ? styles.delayBadgeActive : ''}`} title={isDelayed ? 'Pedido atrasado' : 'Indicador de tiempo'}>
            <i className="bi bi-clock-fill" aria-hidden="true" />
          </span>
          <button
            aria-pressed={isUrgent}
            className={`${styles.cardIndicatorButton} ${styles.urgentIndicator} ${isUrgent ? styles.urgentIndicatorActive : ''}`}
            disabled={!canManageIndicators}
            onClick={(event) => {
              event.stopPropagation()
              onToggleIndicator?.('urgent')
            }}
            title={isUrgent ? 'Urgencia activa' : 'Marcar urgencia'}
            type="button"
          >
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
          </button>
          <button
            aria-pressed={hasContractPriority}
            className={`${styles.cardIndicatorButton} ${styles.contractIndicator} ${hasContractPriority ? styles.contractIndicatorActive : ''}`}
            disabled={!canManageIndicators}
            onClick={(event) => {
              event.stopPropagation()
              onToggleIndicator?.('contractPriority')
            }}
            title={hasContractPriority ? 'Prioridad por contrato activa' : 'Marcar prioridad por contrato'}
            type="button"
          >
            <span aria-hidden="true" />
          </button>
          {isCorrectionRequested && (
            <span className={styles.correctionBadge} title="Pedido en correccion">
              <i className="bi bi-pencil-fill" aria-hidden="true" />
            </span>
          )}
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
        {isCorrectionRequested && (
          <div>
            <dt>Correccion</dt>
            <dd>Solicitada por produccion</dd>
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
