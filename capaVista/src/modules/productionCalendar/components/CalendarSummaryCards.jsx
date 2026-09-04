import { PRODUCTION_STATUSES } from '../mocks/productionCalendar.mock'
import styles from './CalendarSummaryCards.module.css'

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

export default function CalendarSummaryCards({ items }) {
  const paymentConfirmation = items.filter((item) => item.status === PRODUCTION_STATUSES.PAYMENT_CONFIRMATION).length
  const readyProduction = items.filter((item) => item.status === PRODUCTION_STATUSES.READY_PRODUCTION).length
  const inProduction = items.filter((item) => item.status === PRODUCTION_STATUSES.IN_PRODUCTION).length
  const readyDelivery = items.filter((item) => item.status === PRODUCTION_STATUSES.READY_DELIVERY).length

  return (
    <section className={styles.summaryGrid} aria-label="Resumen de calendario">
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
