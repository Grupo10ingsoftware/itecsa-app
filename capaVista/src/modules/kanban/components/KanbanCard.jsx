import styles from '../styles/Kanban.module.css'
import { useDraggable } from '@dnd-kit/react'

function buildSummaryItems({ dueDate, items, product, quantity }) {
  if (Array.isArray(items) && items.length > 0) {
    return items.map((item, index) => ({
      id: item.id ?? `${product}-${index}`,
      dueDate: item.dueDate ?? dueDate,
      product: item.product ?? product ?? 'Producto no definido',
      quantity: item.quantity ?? quantity ?? 'No definida',
    }))
  }

  return [
    {
      id: `${product}-principal`,
      dueDate,
      product: product ?? 'Producto no definido',
      quantity: quantity ?? 'No definida',
    },
  ]
}

function KanbanCard({
  clientName,
  nv,
  product,
  dueDate,
  items,
  quantity,
  delayStatus = 'neutral',
  businessDaysRemaining = null,
  isDelayed,
  isMoveBlocked,
  isCorrectionRequested,
  isPaymentDeconfirmationRequested,
  isUrgent,
  hasContractPriority,
  isProducing,
  canManageIndicators,
  canMove = false,
  onToggleIndicator,
  onOpenDetail,
}) {
  const { ref } = useDraggable({
    id: nv,
    disabled: isMoveBlocked || !canMove,
  })
  const summaryItems = buildSummaryItems({ dueDate, items, product, quantity })
  const delayStatusClass = styles[`delayBadge${delayStatus.charAt(0).toUpperCase()}${delayStatus.slice(1)}`] ?? ''
  const delayTitle = (() => {
    if (businessDaysRemaining === null) {
      return 'Sin fecha de entrega definida'
    }

    if (businessDaysRemaining < 0 || isDelayed) {
      return 'Pedido atrasado'
    }

    if (businessDaysRemaining === 0) {
      return 'Entrega hoy'
    }

    return `${businessDaysRemaining} dia${businessDaysRemaining === 1 ? '' : 's'} habil${businessDaysRemaining === 1 ? '' : 'es'} para la entrega`
  })()

  return (
    <article
      className={[
        styles.orderCard,
        isMoveBlocked ? styles.orderCardBlocked : '',
        isCorrectionRequested ? styles.orderCardCorrection : '',
        isPaymentDeconfirmationRequested ? styles.orderCardPaymentDeconfirmation : '',
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
          <span className={`${styles.delayBadge} ${delayStatusClass}`} title={delayTitle}>
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
            aria-pressed={isProducing}
            className={`${styles.cardIndicatorButton} ${styles.producingIndicator} ${isProducing ? styles.producingIndicatorActive : ''}`}
            disabled={!canManageIndicators}
            onClick={(event) => { event.stopPropagation(); onToggleIndicator?.('producing') }}
            title={isProducing ? 'PRODUCIÉNDOSE activa' : 'Marcar como PRODUCIÉNDOSE'}
            type="button"
          >
            <i className="bi bi-gear-fill" aria-hidden="true" />
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
          {isPaymentDeconfirmationRequested && (
            <span className={styles.deconfirmationBadge} title="Solicitud de desconfirmacion">
              <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>

      <div className={summaryItems.length > 1 ? styles.orderDetailsGrid : styles.orderDetailsStack}>
        {summaryItems.map((item) => (
          <dl className={styles.orderDetails} key={item.id}>
            <div>
              <dt>Producto</dt>
              <dd>{item.product}</dd>
            </div>
            <div>
              <dt>Cantidad</dt>
              <dd>{item.quantity}</dd>
            </div>
            {item.dueDate && (
              <div>
                <dt>Entrega</dt>
                <dd>{item.dueDate}</dd>
              </div>
            )}
          </dl>
        ))}
        {isCorrectionRequested && (
          <dl className={styles.orderDetails}>
            <div>
            <dt>Correccion</dt>
            <dd>Solicitada por produccion</dd>
            </div>
          </dl>
        )}
        {isPaymentDeconfirmationRequested && (
          <dl className={styles.orderDetails}>
            <div>
              <dt>Pago</dt>
              <dd>Desconfirmacion solicitada</dd>
            </div>
          </dl>
        )}
      </div>

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
