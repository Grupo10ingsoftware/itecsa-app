import { formatMonthTitle } from '../utils/calendarUtils'
import styles from './CalendarToolbar.module.css'

export default function CalendarToolbar({
  monthDate,
  onNextMonth,
  onPreviousMonth,
}) {
  return (
    <section className={styles.toolbar} aria-label="Controles del calendario">
      <div aria-hidden="true" className={styles.toolbarSpacer} />

      <div className={styles.monthNavigation}>
        <button onClick={onPreviousMonth} title="Mes anterior" type="button">
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
        <h2>{formatMonthTitle(monthDate)}</h2>
        <button
          onClick={onNextMonth}
          title="Mes siguiente"
          type="button"
        >
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>

      <div aria-hidden="true" className={styles.toolbarSpacer} />
    </section>
  )
}
