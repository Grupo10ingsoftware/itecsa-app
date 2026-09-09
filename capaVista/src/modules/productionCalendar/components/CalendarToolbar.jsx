import { useEffect, useRef } from 'react'
import { formatMonthTitle } from '../utils/calendarUtils'
import styles from './CalendarToolbar.module.css'

export default function CalendarToolbar({
  isDraggingOrder = false,
  monthDate,
  onNavigateNextDuringDrag,
  onNextMonth,
  onPreviousMonth,
}) {
  const dragNavigationArmedRef = useRef(true)

  useEffect(() => {
    if (!isDraggingOrder) {
      dragNavigationArmedRef.current = true
    }
  }, [isDraggingOrder])

  function handleNextDragEnter(event) {
    if (!isDraggingOrder || !dragNavigationArmedRef.current) return

    event.preventDefault()
    dragNavigationArmedRef.current = false
    onNavigateNextDuringDrag?.()
  }

  function handleNextDragOver(event) {
    if (!isDraggingOrder) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleNextDragLeave() {
    dragNavigationArmedRef.current = true
  }

  return (
    <section className={styles.toolbar} aria-label="Controles del calendario">
      <div aria-hidden="true" className={styles.toolbarSpacer} />

      <div className={styles.monthNavigation}>
        <button onClick={onPreviousMonth} title="Mes anterior" type="button">
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
        <h2>{formatMonthTitle(monthDate)}</h2>
        <button
          className={isDraggingOrder ? styles.dragNavigationTarget : ''}
          onClick={onNextMonth}
          onDragEnter={handleNextDragEnter}
          onDragLeave={handleNextDragLeave}
          onDragOver={handleNextDragOver}
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
