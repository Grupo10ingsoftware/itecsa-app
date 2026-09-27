import styles from '../pages/UserManagementPage.module.css'

const SUMMARY_CARDS = Object.freeze([
  { key: 'totalUsuarios', label: 'Total usuarios', icon: 'bi-people', tone: 'total' },
  { key: 'vinculados', label: 'Vinculados', icon: 'bi-check-lg', tone: 'linked' },
  { key: 'pendientes', label: 'Pendientes', icon: 'bi-hourglass-split', tone: 'pending' },
  { key: 'desvinculados', label: 'Desvinculados', icon: 'bi-person-x', tone: 'unlinked' },
  { key: 'noClasificados', label: 'Por revisar', icon: 'bi-exclamation-triangle', tone: 'review' },
])

export default function UserSummaryCards({ isLoading = false, summary }) {
  return (
    <section aria-busy={isLoading} className={styles.summaryGrid} aria-label="Resumen de usuarios">
      {SUMMARY_CARDS.map((card) => (
        <article className={styles.summaryCard} key={card.key}>
          <span className={`${styles.summaryIcon} ${styles[`summaryIcon${card.tone}`]}`} aria-hidden="true">
            <i className={`bi ${card.icon}`} />
          </span>
          <span className={styles.summaryContent}>
            <span>{card.label}</span>
            <strong>{summary ? (summary[card.key] ?? 0) : (isLoading ? '…' : '—')}</strong>
          </span>
        </article>
      ))}
    </section>
  )
}
