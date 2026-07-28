import styles from './StatusPill.module.css'

const STATUS_CLASS_BY_NAME = {
  Definitiva: styles.final,
  Aprobada: styles.approved,
  Rechazada: styles.rejected,
  'En revision': styles.review,
}

export default function StatusPill({ status }) {
  const statusClass = STATUS_CLASS_BY_NAME[status] ?? styles.neutral

  return <span className={`${styles.statusPill} ${statusClass}`}>{status ?? 'Sin estado'}</span>
}
