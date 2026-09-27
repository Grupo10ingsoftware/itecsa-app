import styles from '../pages/UserManagementPage.module.css'
import { displayUserStatus } from '../../../config/userLifecycle.js'

const STATUS_CLASS = Object.freeze({
  Vinculado: styles.statusLinked,
  Activo: styles.statusLinked,
  Desvinculado: styles.statusUnlinked,
  'Pendiente rol': styles.statusPending,
})

export default function UserStatusBadge({ status }) {
  const label = displayUserStatus(status)
  const statusClass = STATUS_CLASS[status] ?? styles.statusNeutral

  return (
    <span className={`${styles.statusBadge} ${statusClass}`}>
      <span className={styles.statusDot} aria-hidden="true" />
      {label || 'Sin estado'}
    </span>
  )
}
