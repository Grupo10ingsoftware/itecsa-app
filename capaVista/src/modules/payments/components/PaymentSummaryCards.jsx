import styles from './PaymentSummaryCards.module.css'

const buildSummaryCards = (counters) => [
  {
    key: 'pending',
    label: 'Pendientes',
    count: counters.pending,
    icon: 'bi-clock',
    iconClassName: styles.summaryIconPending,
  },
  {
    key: 'rejected',
    label: 'Rechazados',
    count: counters.rejected,
    icon: 'bi-x',
    iconClassName: styles.summaryIconRejected,
  },
  {
    key: 'confirmed',
    label: 'Confirmados',
    count: counters.confirmed,
    icon: 'bi-check',
    iconClassName: styles.summaryIconConfirmed,
  },
]

export default function PaymentSummaryCards({ counters }) {
  const summaryCards = buildSummaryCards(counters)

  return (
    <section
      className={`row row-cols-1 row-cols-lg-3 g-2 ${styles.summaryGrid}`}
      aria-label="Resumen de pagos"
    >
      {summaryCards.map((card) => (
        <div className="col" key={card.key}>
          <article
            className={`${styles.summaryCard} d-flex align-items-center h-100`}
          >
            <i className={`bi ${card.icon} ${card.iconClassName}`} />
            <div>
              <span>{card.label}</span>
              <strong>{card.count}</strong>
            </div>
          </article>
        </div>
      ))}
    </section>
  )
}
