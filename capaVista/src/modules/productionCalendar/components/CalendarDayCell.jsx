import { CalendarEvent } from './CalendarEvent.jsx';
import styles from './ProductionCalendarGrid.module.css';

export const MAX_VISIBLE_EVENTS = 1

export function CalendarDayCell({
  day,
  draggedItemId,
  dropTargetDate,
  items,
  onDragEnd,
  onDragStart,
  onDropItem,
  onOpenDay,
  onOpenDetail,
  onSetDropTarget,
}) {
  const visibleItems = items.slice(0, MAX_VISIBLE_EVENTS)
  const hiddenItemsCount = items.length - visibleItems.length
  const isDropTarget = dropTargetDate === day.dateKey
  const canScheduleProduction = day.isCurrentMonth

  return (
    <article
      className={[
        styles.dayCell,
        day.isCurrentMonth ? '' : styles.outsideMonth,
        !day.isBusinessDay ? styles.nonBusinessDay : '',
        isDropTarget ? styles.dropTarget : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragEnter={(event) => {
        if (!canScheduleProduction) return
        event.preventDefault()
        onSetDropTarget(day.dateKey)
      }}
      onDragOver={(event) => {
        if (!canScheduleProduction) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        onSetDropTarget(day.dateKey)
      }}
      onDrop={(event) => {
        if (!canScheduleProduction) return
        event.preventDefault()
        const itemId = event.dataTransfer.getData('text/plain')
        onDropItem(itemId, day.dateKey)
      }}
    >
      <span className={styles.dayNumber}>{day.dayNumber}</span>
      <div className={styles.eventsList}>
        {visibleItems.map((item) => (
          <CalendarEvent
            isDragging={draggedItemId === item.id}
            item={item}
            key={item.id}
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
            onOpenDetail={onOpenDetail}
          />
        ))}
        {hiddenItemsCount > 0 && (
          <button className={styles.moreEventsButton} onClick={() => onOpenDay(day.dateKey)} type="button">
            +{hiddenItemsCount} pedidos mas
          </button>
        )}
      </div>
    </article>
  )
}
