import { formatMonthTitle } from '../utils/calendarUtils'
import styles from './CalendarToolbar.module.css'

export default function CalendarToolbar({ monthDate, onGoToday, onNextMonth, onPreviousMonth }) {
  return (
    <section className={styles.toolbar} aria-label="Controles del calendario">
      <div className={styles.navigationGroup}>
        <button onClick={onPreviousMonth} title="Mes anterior" type="button">
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
        <button onClick={onNextMonth} title="Mes siguiente" type="button">
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
        <button className={styles.todayButton} onClick={onGoToday} type="button">
          Hoy
        </button>
      </div>

      <h2>{formatMonthTitle(monthDate)}</h2>

      <div className={styles.viewGroup} aria-label="Vista de calendario">
        <button className={styles.activeView} type="button">
          Mes
        </button>
        <button type="button">Semana</button>
        <button type="button">Dia</button>
      </div>
    </section>
  )
}
