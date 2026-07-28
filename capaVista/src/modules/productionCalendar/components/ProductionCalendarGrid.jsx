import { PRODUCTION_STATUSES } from '../mocks/productionCalendar.mock'
import { WEEK_DAYS, buildMonthGrid, groupItemsByDate } from '../utils/calendarUtils'
import styles from './ProductionCalendarGrid.module.css'

const STATUS_CLASS = {
  [PRODUCTION_STATUSES.READY_PRODUCTION]: styles.readyProduction,
  [PRODUCTION_STATUSES.IN_PRODUCTION]: styles.inProduction,
  [PRODUCTION_STATUSES.READY_DELIVERY]: styles.readyDelivery,
}

function CalendarEvent({ item }) {
  return (
    <button className={`${styles.calendarEvent} ${STATUS_CLASS[item.status]}`} type="button">
      <strong>{item.orderNumber}</strong>
      <span>{item.clientName}</span>
      <em>{item.productType}</em>
      <small>{item.status}</small>
    </button>
  )
}

export default function ProductionCalendarGrid({ items, monthDate }) {
  const days = buildMonthGrid(monthDate)
  const itemsByDate = groupItemsByDate(items)

  return (
    <section className={styles.calendarShell} aria-label="Calendario mensual de produccion">
      <div className={styles.weekHeader}>
        {WEEK_DAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className={styles.monthGrid}>
        {days.map((day) => {
          const dayItems = itemsByDate.get(day.dateKey) ?? []

          return (
            <article
              className={`${styles.dayCell} ${day.isCurrentMonth ? '' : styles.outsideMonth}`}
              key={day.dateKey}
            >
              <span className={styles.dayNumber}>{day.dayNumber}</span>
              <div className={styles.eventsList}>
                {dayItems.map((item) => (
                  <CalendarEvent item={item} key={item.id} />
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
