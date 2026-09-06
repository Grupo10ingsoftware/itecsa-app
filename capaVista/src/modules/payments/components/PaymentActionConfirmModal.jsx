import { PAYMENT_STATUS } from '@/config/status'
import styles from './PaymentActionConfirmModal.module.css'
import DocumentPreviewModalLayout from './DocumentPreviewModalLayout'
import {
  formatPaymentDateTime,
  getPaymentActionMeta,
} from '../utils/paymentDocuments'

export default function PaymentActionConfirmModal({
  isUpdating = false,
  onCancel,
  onValidate,
  order,
  targetStatus,
}) {
  if (!order || !targetStatus) return null

  const actionMeta = getPaymentActionMeta(targetStatus)

  const statusClassByValue = {
    [PAYMENT_STATUS.PENDIENTE]: styles.detailStatusPending,
    [PAYMENT_STATUS.RECHAZADO]: styles.detailStatusRejected,
    [PAYMENT_STATUS.CONFIRMADO]: styles.detailStatusConfirmed,
  }

  const currentStatusClass =
    statusClassByValue[order.paymentStatus] || styles.detailStatusPending
  const targetStatusClass =
    statusClassByValue[targetStatus] || styles.detailStatusPending

  const renderActionDetailItem = ({ icon, label, value, content }) => (
    <div className={styles.detailItem} key={label}>
      <span className={styles.detailIcon} aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <div>
        <span>{label}</span>
        {content || <strong>{value}</strong>}
      </div>
    </div>
  )

  const managementRows = [
    {
      icon: 'bi-hash',
      label: 'Pedido',
      value: order.nvNumber,
    },
    {
      icon: 'bi-people',
      label: 'Cliente',
      value: order.companyName,
    },
    {
      icon: 'bi-calendar3',
      label: 'Fecha de emisión',
      value: formatPaymentDateTime(order.createdAt),
    },
  ]

  const confirmationRows = [
    {
      icon: 'bi-clock-history',
      label: 'Estado actual',
      content: (
        <strong className={`${styles.detailStatusPill} ${currentStatusClass}`}>
          {order.paymentStatus}
        </strong>
      ),
    },
    {
      icon: actionMeta.icon,
      label: 'Nuevo estado',
      content: (
        <strong className={`${styles.detailStatusPill} ${targetStatusClass}`}>
          {actionMeta.statusLabel}
        </strong>
      ),
    },
    {
      icon: 'bi-arrow-repeat',
      label: 'Resultado esperado',
      value: 'Actualizar estado del pago',
    },
  ]

  const footer = (
    <>
      <button
        className="btn btn-outline-secondary"
        disabled={isUpdating}
        onClick={onCancel}
        type="button"
      >
        Cancelar
      </button>

      <button
        className={styles.holdConfirmButton}
        disabled={isUpdating}
        onClick={onValidate}
        type="button"
      >
        <span>
          {isUpdating
            ? actionMeta.completedLabel
            : actionMeta.holdLabel}
        </span>
      </button>
    </>
  )

  return (
    <DocumentPreviewModalLayout
      bodyClassName={styles.confirmModalBody}
      closeAriaLabel="Cancelar cambio de estado"
      description="Revisa los datos del pedido y confirma el cambio de estado de pago."
      footer={footer}
      kicker="Cambio de estado"
      onClose={onCancel}
      title={actionMeta.modalTitle}
      titleId="payment-action-confirm-title"
      variant="actionConfirm"
    >
      <div className={styles.actionConfirmSummary}>
        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <i className="bi bi-receipt" aria-hidden="true" />
            <span>Detalle del pedido</span>
          </header>

          <div className={styles.cardBody}>
            {managementRows.map(renderActionDetailItem)}
          </div>
        </section>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <i className="bi bi-shield-exclamation" aria-hidden="true" />
            <span>Confirmación de acción</span>
          </header>

          <div className={styles.cardBody}>
            {confirmationRows.map(renderActionDetailItem)}
          </div>
        </section>
      </div>
    </DocumentPreviewModalLayout>
  )
}
