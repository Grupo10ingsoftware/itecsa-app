import { useAuth } from "../../../hooks/useAuth";
import { PERMISSIONS } from "../../../config/permissions";
import { useMemo, useState } from 'react'
import { WEEK_DAYS, buildMonthGrid, groupItemsByDate, isBusinessDateKey, isSameMonth } from '../utils/calendarUtils'
import styles from './ProductionCalendarGrid.module.css'

const MAX_VISIBLE_EVENTS = 1

function formatDayTitle(dateKey) {
  if (!dateKey) return 'Sin fecha programada'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dateKey}T00:00:00`))
}

function formatScheduleState(item) {
  if (!item.dueDate) return 'Sin fecha programada'
  if (!isBusinessDateKey(item.dueDate)) return 'Fecha no habil'

  return item.status
}

function getProductSummary(item) {
  const sourceItems = Array.isArray(item.items) ? item.items : []
  const productNames = sourceItems
    .map((detail) => detail.productType ?? detail.product ?? detail.nombre_producto ?? detail.producto)
    .filter(Boolean)
  const uniqueProductNames = [...new Set(productNames)]

  return uniqueProductNames.length > 0
    ? uniqueProductNames.join(', ')
    : item.productType
}

function CalendarEvent({ isDragging, item, onDragEnd, onDragStart }) {
  const { hasPermission } = useAuth()
  const productSummary = getProductSummary(item)

  return (
    <button
      className={[styles.calendarEvent, isDragging ? styles.draggingEvent : '']
        .filter(Boolean)
        .join(' ')}
      draggable={hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)}
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', item.id)
        onDragStart(item.id)
      }}
      title="Arrastrar para cambiar fecha de entrega"
      type="button"
    >
      <span className={styles.eventLine}>
        <b>Pedido N°:</b>
        <strong>{item.orderNumber}</strong>
      </span>
      <span className={styles.eventLine}>
        <b>Cliente:</b>
        <span>{item.clientName}</span>
      </span>
      <span className={styles.eventLine}>
        <b>Productos:</b>
        <em>{productSummary}</em>
      </span>
      <span className={styles.eventLine}>
        <b>Etapa:</b>
        <small>{formatScheduleState(item)}</small>
      </span>
    </button>
  )
}

function DeliveryChangeConfirmModal({ change, onCancel, onConfirm }) {
  if (!change) return null

  return (
    <div className={styles.modalLayer} role="presentation">
      <section aria-labelledby="delivery-change-title" aria-modal="true" className={styles.confirmModal} role="dialog">
        <header className={styles.modalHeader}>
          <div>
            <span>Confirmacion</span>
            <h2 id="delivery-change-title">Cambiar fecha de entrega</h2>
          </div>
        </header>

        <div className={styles.modalBody}>
          <p className={styles.confirmText}>
            Estas seguro que quieres cambiar la fecha de entrega del pedido {change.item.orderNumber} de{' '}
            {formatDayTitle(change.fromDate)} a {formatDayTitle(change.toDate)}?
          </p>
        </div>

        <footer className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onCancel} type="button">
            No
          </button>
          <button className={styles.primaryButton} onClick={onConfirm} type="button">
            Si
          </button>
        </footer>
      </section>
    </div>
  )
}

function DeliveryChangeCredentialsModal({ change, onCancel, onConfirm }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!change) return null

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedPin = pin.trim()

    if (!/^\d{6}$/.test(trimmedPin)) {
      setError('Ingrese un PIN valido de 6 digitos.')
      return
    }

    setIsSubmitting(true)

    try {
      await onConfirm({ pin: trimmedPin })
    } catch (submitError) {
      console.error('Error actualizando fecha de entrega:', submitError)
      setError('No fue posible cambiar la fecha de entrega.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation">
      <form
        aria-labelledby="delivery-credentials-title"
        aria-modal="true"
        className={styles.confirmModal}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <header className={styles.modalHeader}>
          <div>
            <span>Validacion PIN</span>
            <h2 id="delivery-credentials-title">Confirmar cambio</h2>
          </div>
          <button aria-label="Cerrar validacion" onClick={onCancel} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          <p className={styles.confirmText}>
            Ingrese su PIN para hacer efectivo el cambio de fecha de {change.item.orderNumber}.
          </p>
          <label className={styles.credentialsLabel}>
            <span>PIN</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                setError('')
              }}
              placeholder="000000"
              type="password"
              value={pin}
            />
          </label>
          {error && <p className={styles.modalError}>{error}</p>}
        </div>

        <footer className={styles.modalFooter}>
          <button className={styles.secondaryButton} disabled={isSubmitting} onClick={onCancel} type="button">
            Cancelar
          </button>
          <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Confirmando...' : 'Confirmar'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function DayOrdersModal({ dateKey, draggedItemId, items, onClose, onDragEnd, onDragStart }) {
  const { hasPermission } = useAuth()
  if (!dateKey) return null

  function handleModalItemDragStart(event, itemId) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemId)
    onDragStart(itemId)
    setTimeout(onClose, 0)
  }

  return (
    <div className={styles.modalLayer} onMouseDown={onClose} role="presentation">
      <section
        aria-labelledby="day-orders-modal-title"
        aria-modal="true"
        className={styles.modalCard}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className={styles.modalHeader}>
          <div>
            <span>Entregas del dia</span>
            <h2 id="day-orders-modal-title">{formatDayTitle(dateKey)}</h2>
          </div>
          <button aria-label="Cerrar modal" onClick={onClose} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          {items.map((item) => (
            <article
              className={[
                styles.dayOrderRow,
                styles.draggableDayOrderRow,
                draggedItemId === item.id ? styles.draggingEvent : '',
              ]
                .filter(Boolean)
                .join(' ')}
              draggable={hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)}
              key={item.id}
              onDragEnd={onDragEnd}
              onDragStart={(event) => handleModalItemDragStart(event, item.id)}
              title="Arrastrar para cambiar fecha de entrega"
            >
              <div>
                <strong>{item.orderNumber}</strong>
                <span>{item.clientName}</span>
              </div>
              <dl>
                <div>
                  <dt>Producto</dt>
                  <dd>{item.productType}</dd>
                </div>
                <div>
                  <dt>Cantidad</dt>
                  <dd>{item.quantity}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{item.status}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function PendingOrdersTray({ draggedItemId, items, onDragEnd, onDragStart }) {
  const { hasPermission } = useAuth()

  function handleDragStart(event, itemId) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemId)
    onDragStart(itemId)
  }

  return (
    <aside className={styles.pendingTray} aria-label="Pedidos pendientes de programar">
      <header className={styles.pendingTrayHeader}>
        <div>
          <span>Produccion</span>
          <h2>Pendientes de programar</h2>
        </div>
        <strong>{items.length}</strong>
      </header>

      <div className={styles.pendingTrayBody}>
        {items.length === 0 ? (
          <p className={styles.emptyPendingState}>No hay pedidos pendientes de fecha.</p>
        ) : items.map((item) => (
          <article
            className={[
              styles.pendingOrderCard,
              draggedItemId === item.id ? styles.draggingEvent : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable={hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)}
            key={item.id}
            onDragEnd={onDragEnd}
            onDragStart={(event) => handleDragStart(event, item.id)}
            title="Arrastrar a un dia habil del calendario"
          >
            <div className={styles.pendingOrderTitle}>
              <strong>{item.orderNumber}</strong>
              <span>{formatScheduleState(item)}</span>
            </div>
            <dl>
              <div>
                <dt>Cliente</dt>
                <dd>{item.clientName}</dd>
              </div>
              <div>
                <dt>Producto</dt>
                <dd>{item.productType}</dd>
              </div>
              <div>
                <dt>Cantidad</dt>
                <dd>{item.quantity}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </aside>
  )
}

function CalendarDayCell({
  day,
  draggedItemId,
  dropTargetDate,
  items,
  onDragEnd,
  onDragStart,
  onDropItem,
  onOpenDay,
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

export default function ProductionCalendarGrid({ items, monthDate, onChangeDeliveryDate }) {
  const [selectedDayKey, setSelectedDayKey] = useState(null)
  const [pendingChange, setPendingChange] = useState(null)
  const [isCredentialStepOpen, setIsCredentialStepOpen] = useState(false)
  const [draggedItemId, setDraggedItemId] = useState(null)
  const [dropTargetDate, setDropTargetDate] = useState(null)
  const days = buildMonthGrid(monthDate)
  const scheduledMonthItems = useMemo(
    () => items.filter((item) => isBusinessDateKey(item.dueDate) && isSameMonth(item.dueDate, monthDate)),
    [items, monthDate],
  )
  const pendingItems = useMemo(
    () => items.filter((item) => !isBusinessDateKey(item.dueDate)),
    [items],
  )
  const itemsByDate = useMemo(() => groupItemsByDate(scheduledMonthItems), [scheduledMonthItems])
  const selectedDayItems = selectedDayKey ? (itemsByDate.get(selectedDayKey) ?? []) : []

  const { hasPermission } = useAuth()
  function handleDropItem(itemId, targetDate) {
    if (!hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)) return
    setDraggedItemId(null)
    setDropTargetDate(null)
    const item = items.find((currentItem) => String(currentItem.id) === String(itemId))

    if (!item || !targetDate || item.dueDate === targetDate) return

    setPendingChange({
      item,
      fromDate: item.dueDate,
      toDate: targetDate,
    })
    setIsCredentialStepOpen(false)
  }

  function handleDragEnd() {
    setDraggedItemId(null)
    setDropTargetDate(null)
  }

  function closeDeliveryChangeFlow() {
    setPendingChange(null)
    setIsCredentialStepOpen(false)
  }

  async function confirmCredentials(credentials) {
    if (!pendingChange) return

    await onChangeDeliveryDate?.(pendingChange.item.id, pendingChange.toDate, credentials)
    closeDeliveryChangeFlow()
  }

  return (
    <>
      <section className={styles.calendarShell} aria-label="Calendario mensual de produccion">
        <div className={styles.calendarLayout}>
          <div className={styles.businessCalendar}>
            <div className={styles.weekHeader}>
              {WEEK_DAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className={styles.monthGrid}>
              {days.map((day) => (
                <CalendarDayCell
                  day={day}
                  draggedItemId={draggedItemId}
                  dropTargetDate={dropTargetDate}
                  items={itemsByDate.get(day.dateKey) ?? []}
                  key={day.dateKey}
                  onDragEnd={handleDragEnd}
                  onDragStart={setDraggedItemId}
                  onDropItem={handleDropItem}
                  onOpenDay={setSelectedDayKey}
                  onSetDropTarget={setDropTargetDate}
                />
              ))}
            </div>
          </div>

          <PendingOrdersTray
            draggedItemId={draggedItemId}
            items={pendingItems}
            onDragEnd={handleDragEnd}
            onDragStart={setDraggedItemId}
          />
        </div>

        <DayOrdersModal
          dateKey={selectedDayKey}
          draggedItemId={draggedItemId}
          items={selectedDayItems}
          onClose={() => setSelectedDayKey(null)}
          onDragEnd={handleDragEnd}
          onDragStart={setDraggedItemId}
        />
      </section>
      <DeliveryChangeConfirmModal
        change={!isCredentialStepOpen ? pendingChange : null}
        onCancel={closeDeliveryChangeFlow}
        onConfirm={() => setIsCredentialStepOpen(true)}
      />
      <DeliveryChangeCredentialsModal
        change={isCredentialStepOpen ? pendingChange : null}
        onCancel={closeDeliveryChangeFlow}
        onConfirm={confirmCredentials}
      />
    </>
  )
}
