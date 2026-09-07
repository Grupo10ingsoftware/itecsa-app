import { PAYMENT_STATUS } from '@/config/status'
import { formatPaymentDate } from '../utils/paymentDocuments'
import PaymentRowActions from './PaymentRowActions'
import PaymentStatusBadge from './PaymentStatusBadge'
import styles from './PaymentOrderMobileList.module.css'

const MOBILE_CARD_STATUS_CLASS = {
  [PAYMENT_STATUS.PENDIENTE]: styles.mobileCardPending,
  [PAYMENT_STATUS.RECHAZADO]: styles.mobileCardRejected,
  [PAYMENT_STATUS.CONFIRMADO]: styles.mobileCardConfirmed,
}

export default function PaymentOrderMobileList({
  canUpdatePaymentStatus,
  editingStatus,
  isUpdatingPaymentStatus = false,
  orders,
  onCloseEditor,
  onPrefetchDetails,
  onSelectStatus,
  onToggleEditor,
  onViewDetail,
}) {
  return (
    <section
      className={`d-lg-none ${styles.mobileList}`}
      aria-label="Pedidos de pago"
    >
      {orders.length > 0 ? (
        orders.map((order) => (
          <article
            className={`${styles.mobileCard} ${
              MOBILE_CARD_STATUS_CLASS[order.paymentStatus] || styles.mobileCardPending
            }`}
            key={`mobile-${order.id}`}
          >
            <header className={styles.mobileCardHeader}>
              <div>
                <span>Pedido</span>
                <strong>{order.nvNumber}</strong>
              </div>
            </header>

            <dl className={styles.mobileDataList}>
              <div>
                <dt>Cliente</dt>
                <dd>{order.companyName}</dd>
              </div>
              <div>
                <dt>RUT</dt>
                <dd>{order.rut}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatPaymentDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd className={styles.mobileStatusBadgeWrap}>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </dd>
              </div>
            </dl>

            <div className="d-grid gap-2 mt-3">
              <PaymentRowActions
                canUpdatePaymentStatus={canUpdatePaymentStatus}
                editingStatus={editingStatus}
                isUpdatingPaymentStatus={isUpdatingPaymentStatus}
                isMobile
                onCloseEditor={onCloseEditor}
                onPrefetchDetails={onPrefetchDetails}
                onSelectStatus={onSelectStatus}
                onToggleEditor={onToggleEditor}
                onViewDetail={onViewDetail}
                order={order}
              />
            </div>
          </article>
        ))
      ) : (
        <div className={styles.mobileCard}>
          No hay pedidos que coincidan con los filtros aplicados.
        </div>
      )}
    </section>
  )
}
