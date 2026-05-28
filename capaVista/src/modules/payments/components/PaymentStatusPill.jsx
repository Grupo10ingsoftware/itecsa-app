import { PAYMENT_STATUS } from '@/config/status'
import styles from './PaymentStatusPill.module.css'

const STATUS_CLASS_BY_VALUE = {
  [PAYMENT_STATUS.PENDIENTE]: styles.statusPending,
  [PAYMENT_STATUS.RECHAZADO]: styles.statusRejected,
  [PAYMENT_STATUS.CONFIRMADO]: styles.statusConfirmed,
}

export default function PaymentStatusPill({ status }) {
  return (
    <span
      className={`${styles.paymentStatusPill} ${
        STATUS_CLASS_BY_VALUE[status] || styles.statusPending
      }`}
    >
      {status}
    </span>
  )
}
