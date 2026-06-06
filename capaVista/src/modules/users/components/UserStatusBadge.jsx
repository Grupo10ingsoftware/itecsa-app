import styles from '../pages/UserManagementPage.module.css'

const STATUS_CLASS = Object.freeze({
  Activo: styles.statusActive,
  Desvinculado: styles.statusUnlinked,
})

export default function UserStatusBadge({ status }) {
  const statusClass = STATUS_CLASS[status] ?? styles.statusNeutral

  return <span className={`${styles.statusBadge} ${statusClass}`}>{status}</span>
}
