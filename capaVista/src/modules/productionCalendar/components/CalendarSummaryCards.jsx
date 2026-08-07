import { PRODUCTION_STATUSES } from '../mocks/productionCalendar.mock'
import styles from './CalendarSummaryCards.module.css'

function OperationalLoadCard({ load }) {
  const level = load.percentage > 75 ? 'overloaded' : load.percentage > 50 ? 'warning' : 'normal'
  const progressWidth = `${Math.min(load.percentage, 100)}%`
  const loadText =
    load.percentage > 75
      ? 'Carga Alta'
      : load.percentage > 50
        ? 'Carga Media'
        : 'Carga Controlada'

  return (
    <article className={`${styles.operationalCard} ${styles[level]}`}>
      <div className={styles.ring} style={{ '--load-value': `${Math.min(load.percentage, 100)}%` }}>
        <span>{load.percentage}%</span>
      </div>
      <div className={styles.operationalInfo}>
        <span>Carga Operativa</span>
        <strong>{loadText}</strong>
        <p>Carga operativa del dia de hoy</p>
        <div className={styles.capacityTrack} aria-hidden="true">
          <i style={{ width: progressWidth }} />
        </div>
      </div>
    </article>
  )
}

function StatusCard({ accent, count, icon, label, subtitle }) {
  return (
    <article className={styles.statusCard} style={{ '--summary-accent': accent }}>
      <header>
        <div>
          <i className={`bi ${icon}`} aria-hidden="true" />
          <strong>{label}</strong>
        </div>
        <span>{count}</span>
      </header>
      <p>{subtitle}</p>
    </article>
  )
}

export default function CalendarSummaryCards({ items, load }) {
  const paymentConfirmation = items.filter((item) => item.status === PRODUCTION_STATUSES.PAYMENT_CONFIRMATION).length
  const readyProduction = items.filter((item) => item.status === PRODUCTION_STATUSES.READY_PRODUCTION).length
  const inProduction = items.filter((item) => item.status === PRODUCTION_STATUSES.IN_PRODUCTION).length
  const readyDelivery = items.filter((item) => item.status === PRODUCTION_STATUSES.READY_DELIVERY).length

  return (
    <section className={styles.summaryGrid} aria-label="Resumen de calendario">
      <OperationalLoadCard load={load} />
      <StatusCard
        accent="#f97316"
        count={paymentConfirmation}
        icon="bi-cash-coin"
        label="Confirmacion de pago"
        subtitle="Pedidos pendientes de pago"
      />
      <StatusCard
        accent="#2563eb"
        count={readyProduction}
        icon="bi-clipboard-check"
        label="Listo para produccion"
        subtitle="Pedidos programados"
      />
      <StatusCard
        accent="#f97316"
        count={inProduction}
        icon="bi-gear-wide-connected"
        label="En produccion"
        subtitle="Pedidos en proceso"
      />
      <StatusCard
        accent="#248f55"
        count={readyDelivery}
        icon="bi-check2-circle"
        label="Listo para entrega"
        subtitle="Pedidos finalizados"
      />
    </section>
  )
}
