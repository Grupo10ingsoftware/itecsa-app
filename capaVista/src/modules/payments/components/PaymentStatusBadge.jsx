import { PAYMENT_STATUS } from '@/config/status'
import styles from './PaymentStatusBadge.module.css'

const STATUS_CLASS_BY_VALUE = {
  [PAYMENT_STATUS.PENDIENTE]: styles.statusPending,
  [PAYMENT_STATUS.RECHAZADO]: styles.statusRejected,
  [PAYMENT_STATUS.CONFIRMADO]: styles.statusConfirmed,
}

export default function PaymentStatusBadge({ status, label, className = '' }) {
  const safeStatus = status || label || PAYMENT_STATUS.PENDIENTE
  const badgeClassName = `${styles.paymentStatusBadge} ${
    STATUS_CLASS_BY_VALUE[safeStatus] || styles.statusPending
  } ${className}`.trim()

  return <span className={badgeClassName}>{label || safeStatus}</span>
}
