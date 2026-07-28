import { PRODUCTION_STATUSES } from '../mocks/productionCalendar.mock'
import styles from './CalendarLegend.module.css'

export default function CalendarLegend({ onOpenDeliveryModal }) {
  return (
    <footer className={styles.legendBar}>
      <div className={styles.legendItems}>
        <span className={styles.readyProduction}>{PRODUCTION_STATUSES.READY_PRODUCTION}</span>
        <span className={styles.inProduction}>{PRODUCTION_STATUSES.IN_PRODUCTION}</span>
        <span className={styles.readyDelivery}>{PRODUCTION_STATUSES.READY_DELIVERY}</span>
      </div>
      <button className={styles.deliveryButton} onClick={onOpenDeliveryModal} type="button">
        <i className="bi bi-calendar2-week" aria-hidden="true" />
        Modificar fecha de entrega
      </button>
    </footer>
  )
}
