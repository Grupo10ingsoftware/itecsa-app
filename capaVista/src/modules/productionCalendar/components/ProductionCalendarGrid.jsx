import { useAuth } from "../../../hooks/useAuth";
import { PERMISSIONS } from "../../../config/permissions";
import { useEffect, useMemo, useState } from 'react'
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

function displayValue(value, fallback = 'No definido') {
  if (typeof value === 'string') return value.trim() || fallback

  return value ?? fallback
}

function getProductSummary(item) {
  if (Array.isArray(item.productTypes) && item.productTypes.length > 0) {
    return item.productTypes.join(', ')
  }

  const sourceItems = Array.isArray(item.items) ? item.items : []
  const productNames = sourceItems
    .map((detail) => detail.productType ?? detail.product ?? detail.nombre_producto ?? detail.producto)
    .filter(Boolean)
  const uniqueProductNames = [...new Set(productNames)]

  return uniqueProductNames.length > 0
    ? uniqueProductNames.join(', ')
    : item.productType
}

function isLanyardItem(item) {
  return String(item.product ?? item.productType ?? '').toLowerCase().includes('lanyard')
}

function getCalendarOrderItems(order) {
  const sourceItems = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [{
        id: `${order.id}-principal`,
        product: order.productType,
        quantity: order.quantity,
        dueDate: order.dueDate,
        manufacturingDetails: order.manufacturingDetails,
      }]

  return sourceItems.map((item, index) => ({
    ...item,
    id: item.id ?? item.id_detalle_pedido ?? `${order.id}-${index}`,
    product: item.product ?? item.productType ?? item.nombre_producto ?? item.producto ?? order.productType ?? 'Producto no definido',
    quantity: item.quantity ?? item.cantidad ?? order.quantity ?? null,
    dueDate: item.dueDate ?? item.fecha_estimada_termino ?? order.dueDate ?? null,
    manufacturingDetails: item.manufacturingDetails ?? {},
  }))
}

function getManufacturingDetails(item, order) {
  const productName = String(item.product ?? '').toLowerCase()
  const isTarjeta = productName.includes('tarjeta')
  const isLanyard = productName.includes('lanyard')
  const details = item.manufacturingDetails ?? {}

  return {
    width: displayValue(details.width, isTarjeta ? '85.6 mm' : isLanyard ? '20 mm' : 'No definido'),
    length: displayValue(details.length, isTarjeta ? '53.9 mm' : isLanyard ? '90 cm' : 'No definido'),
    tapeTexture: displayValue(details.tapeTexture, 'Poliester'),
    backgroundColor: displayValue(details.backgroundColor),
    reverseLegend: displayValue(details.reverseLegend ?? details.legend),
    frontLegend: displayValue(details.frontLegend ?? details.legend, `${order.clientName ?? 'Cliente'} - ${item.product ?? 'Producto'}`),
    endings: displayValue(details.endings),
    cardType: displayValue(details.cardType, 'Plastificada'),
    seller: displayValue(details.seller ?? order.seller, 'Ventas ITECSA'),
    dueDate: displayValue(details.dueDate ?? item.dueDate ?? order.dueDate, 'Por definir'),
  }
}

function normalizeLabelName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function hasOrderLabel(order, expectedNames = []) {
  const labels = Array.isArray(order.etiquetas) ? order.etiquetas : []
  const normalizedExpectedNames = expectedNames.map(normalizeLabelName)

  return labels.some((label) =>
    normalizedExpectedNames.includes(normalizeLabelName(label?.nombre_etiqueta ?? label?.name ?? label)),
  )
}

function getOrderToneClass(order) {
  if (hasOrderLabel(order, ['Prioridad por contrato', 'Cliente con contrato'])) return styles.contractPriorityEvent
  if (hasOrderLabel(order, ['Urgencia'])) return styles.urgentEvent

  return ''
}

function CalendarEvent({ isDragging, item, onDragEnd, onDragStart, onOpenDetail }) {
  const { hasPermission } = useAuth()
  const productSummary = getProductSummary(item)

  return (
    <button
      className={[styles.calendarEvent, getOrderToneClass(item), isDragging ? styles.draggingEvent : '']
        .filter(Boolean)
        .join(' ')}
      draggable={hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)}
      onDragEnd={onDragEnd}
      onDoubleClick={() => onOpenDetail(item)}
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

function OrderDetailModal({ order, onClose }) {
  if (!order) return null

  const orderItems = getCalendarOrderItems(order)

  return (
    <div className={styles.modalLayer} onMouseDown={onClose} role="presentation">
      <section
        aria-labelledby="calendar-order-detail-title"
        aria-modal="true"
        className={styles.orderDetailModal}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className={styles.modalHeader}>
          <div>
            <span>{order.orderNumber}</span>
            <h2 id="calendar-order-detail-title">Detalle del pedido</h2>
          </div>
          <button aria-label="Cerrar detalle" onClick={onClose} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.orderDetailBody}>
          <section className={styles.orderOverview} aria-label="Resumen del pedido">
            <div>
              <dt>Cliente</dt>
              <dd>{order.clientName}</dd>
            </div>
            <div>
              <dt>Etapa</dt>
              <dd>{formatScheduleState(order)}</dd>
            </div>
            <div>
              <dt>Fecha de Entrega</dt>
              <dd>{displayValue(order.dueDate, 'Por definir')}</dd>
            </div>
            <div>
              <dt>Vendedor responsable</dt>
              <dd>{displayValue(order.seller, 'Ventas ITECSA')}</dd>
            </div>
          </section>

          <section className={styles.detailProducts} aria-label="Productos del pedido">
            {orderItems.map((item) => {
              const manufacturingDetails = getManufacturingDetails(item, order)
              const isLanyard = isLanyardItem(item)

              return (
                <article className={styles.detailProductCard} key={item.id}>
                  <h3>{item.product}</h3>
                  <dl>
                    <div>
                      <dt>Fecha de Entrega</dt>
                      <dd>{manufacturingDetails.dueDate}</dd>
                    </div>
                    <div>
                      <dt>Tipo de producto</dt>
                      <dd>{item.product}</dd>
                    </div>
                    <div>
                      <dt>Cantidad</dt>
                      <dd>{item.quantity ?? 'No definida'}</dd>
                    </div>
                    <div>
                      <dt>Ancho {isLanyard ? 'Cinta' : ''}</dt>
                      <dd>{manufacturingDetails.width}</dd>
                    </div>
                    <div>
                      <dt>Largo {isLanyard ? 'Cinta' : ''}</dt>
                      <dd>{manufacturingDetails.length}</dd>
                    </div>
                    {isLanyard ? (
                      <>
                        <div>
                          <dt>Textura cinta</dt>
                          <dd>{manufacturingDetails.tapeTexture}</dd>
                        </div>
                        <div>
                          <dt>Color de Fondo</dt>
                          <dd>{manufacturingDetails.backgroundColor}</dd>
                        </div>
                        <div>
                          <dt>Leyenda Reversa</dt>
                          <dd>{manufacturingDetails.reverseLegend}</dd>
                        </div>
                        <div>
                          <dt>Leyenda Anverso</dt>
                          <dd>{manufacturingDetails.frontLegend}</dd>
                        </div>
                        <div>
                          <dt>Terminaciones</dt>
                          <dd>{manufacturingDetails.endings}</dd>
                        </div>
                      </>
                    ) : (
                      <div>
                        <dt>Tipo de tarjeta</dt>
                        <dd>{manufacturingDetails.cardType}</dd>
                      </div>
                    )}
                  </dl>
                </article>
              )
            })}
          </section>
        </div>
      </section>
    </div>
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

function DayOrdersModal({ dateKey, draggedItemId, items, onClose, onDragEnd, onDragStart, onOpenDetail }) {
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
                getOrderToneClass(item),
                draggedItemId === item.id ? styles.draggingEvent : '',
              ]
                .filter(Boolean)
                .join(' ')}
              draggable={hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)}
              key={item.id}
              onDragEnd={onDragEnd}
              onDoubleClick={() => onOpenDetail(item)}
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

function PendingOrdersTray({ draggedItemId, items, onDragEnd, onDragStart, onOpenDetail }) {
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
              getOrderToneClass(item),
              draggedItemId === item.id ? styles.draggingEvent : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable={hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)}
            key={item.id}
            onDragEnd={onDragEnd}
            onDoubleClick={() => onOpenDetail(item)}
            onDragStart={(event) => handleDragStart(event, item.id)}
            title="Doble click para ver detalle. Arrastrar a un dia habil del calendario"
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
              <em>{getProductSummary(item)}</em>
            </span>
            <span className={styles.eventLine}>
              <b>Etapa:</b>
              <small>{formatScheduleState(item)}</small>
            </span>
          </article>
        ))}
      </div>
    </aside>
  )
}

function TransferOrdersTray({ draggedItemId, items, onDragEnd, onDragStart, onDropTransferItem, onOpenDetail }) {
  const { hasPermission } = useAuth()
  const canReceiveTransfer = hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)

  function handleDragStart(event, itemId) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemId)
    onDragStart(itemId)
  }

  function handleDragOver(event) {
    if (!canReceiveTransfer || !draggedItemId) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(event) {
    if (!canReceiveTransfer) return

    event.preventDefault()
    const itemId = event.dataTransfer.getData('text/plain')
    onDropTransferItem(itemId)
  }

  return (
    <aside
      className={[styles.transferTray, draggedItemId ? styles.transferTrayActive : '']
        .filter(Boolean)
        .join(' ')}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-label="Bandeja temporal para mover pedidos de mes"
    >
      <header className={styles.transferTrayHeader}>
        <div>
          <span>Produccion</span>
          <h2>Bandeja para mover pedidos</h2>
        </div>
        <strong>{items.length}</strong>
      </header>

      <div className={styles.transferTrayBody}>
        {items.length === 0 ? (
          <p className={styles.emptyTransferState}>Arrastra aqui los pedidos que quieras mover a otro mes.</p>
        ) : items.map((item) => (
          <article
            className={[
              styles.transferOrderCard,
              getOrderToneClass(item),
              draggedItemId === item.id ? styles.draggingEvent : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable={canReceiveTransfer}
            key={item.id}
            onDragEnd={onDragEnd}
            onDoubleClick={() => onOpenDetail(item)}
            onDragStart={(event) => handleDragStart(event, item.id)}
            title="Arrastrar a un dia habil del calendario"
          >
            <span className={styles.eventLine}>
              <b>Pedido NÂ°:</b>
              <strong>{item.orderNumber}</strong>
            </span>
            <span className={styles.eventLine}>
              <b>Cliente:</b>
              <span>{item.clientName}</span>
            </span>
            <span className={styles.eventLine}>
              <b>Productos:</b>
              <em>{getProductSummary(item)}</em>
            </span>
            <span className={styles.eventLine}>
              <b>Fecha actual:</b>
              <small>{displayValue(item.dueDate, 'Sin fecha')}</small>
            </span>
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

export default function ProductionCalendarGrid({
  allItems,
  draggedItemId,
  items,
  monthDate,
  onChangeDeliveryDate,
  onDragEnd,
  onDragStart,
  toolbar,
}) {
  const [selectedDayKey, setSelectedDayKey] = useState(null)
  const [selectedDetailOrder, setSelectedDetailOrder] = useState(null)
  const [pendingChange, setPendingChange] = useState(null)
  const [isCredentialStepOpen, setIsCredentialStepOpen] = useState(false)
  const [dropTargetDate, setDropTargetDate] = useState(null)
  const [transferItemIds, setTransferItemIds] = useState([])
  const days = buildMonthGrid(monthDate)
  const sourceItems = Array.isArray(allItems) ? allItems : items
  const transferItemIdSet = useMemo(
    () => new Set(transferItemIds.map((itemId) => String(itemId))),
    [transferItemIds],
  )
  const visibleItems = useMemo(
    () => items.filter((item) => !transferItemIdSet.has(String(item.id))),
    [items, transferItemIdSet],
  )
  const transferItems = useMemo(
    () => sourceItems.filter((item) => transferItemIdSet.has(String(item.id))),
    [sourceItems, transferItemIdSet],
  )
  const scheduledMonthItems = useMemo(
    () => visibleItems.filter((item) => isBusinessDateKey(item.dueDate) && isSameMonth(item.dueDate, monthDate)),
    [visibleItems, monthDate],
  )
  const pendingItems = useMemo(
    () => visibleItems.filter((item) => !isBusinessDateKey(item.dueDate)),
    [visibleItems],
  )
  const itemsByDate = useMemo(() => groupItemsByDate(scheduledMonthItems), [scheduledMonthItems])
  const selectedDayItems = selectedDayKey ? (itemsByDate.get(selectedDayKey) ?? []) : []

  const { hasPermission } = useAuth()

  useEffect(() => {
    const sourceItemIds = new Set(sourceItems.map((item) => String(item.id)))

    setTransferItemIds((currentIds) => currentIds.filter((itemId) => sourceItemIds.has(String(itemId))))
  }, [sourceItems])

  function handleDropTransferItem(itemId) {
    if (!hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)) return
    onDragEnd?.()
    setDropTargetDate(null)

    const item = sourceItems.find((currentItem) => String(currentItem.id) === String(itemId))
    if (!item) return

    setTransferItemIds((currentIds) => {
      if (currentIds.some((currentId) => String(currentId) === String(itemId))) return currentIds

      return [...currentIds, item.id]
    })
  }

  function handleDropItem(itemId, targetDate) {
    if (!hasPermission(PERMISSIONS.UPDATE_DELIVERY_DATE)) return
    onDragEnd?.()
    setDropTargetDate(null)
    const item = sourceItems.find((currentItem) => String(currentItem.id) === String(itemId))
    const isTransferItem = transferItemIdSet.has(String(itemId))

    if (!item || !targetDate) return

    if (item.dueDate === targetDate) {
      if (isTransferItem) {
        setTransferItemIds((currentIds) => currentIds.filter((currentId) => String(currentId) !== String(itemId)))
      }
      return
    }

    setPendingChange({
      item,
      fromDate: item.dueDate,
      toDate: targetDate,
    })
    setIsCredentialStepOpen(false)
  }

  function handleDragEnd() {
    onDragEnd?.()
    setDropTargetDate(null)
  }

  function closeDeliveryChangeFlow() {
    setPendingChange(null)
    setIsCredentialStepOpen(false)
  }

  async function confirmCredentials(credentials) {
    if (!pendingChange) return

    await onChangeDeliveryDate?.(pendingChange.item.id, pendingChange.toDate, credentials)
    setTransferItemIds((currentIds) =>
      currentIds.filter((itemId) => String(itemId) !== String(pendingChange.item.id)),
    )
    closeDeliveryChangeFlow()
  }

  return (
    <>
      <div className={styles.calendarGridStack}>
        <TransferOrdersTray
          draggedItemId={draggedItemId}
          items={transferItems}
          onDragEnd={handleDragEnd}
          onDragStart={onDragStart}
          onDropTransferItem={handleDropTransferItem}
          onOpenDetail={setSelectedDetailOrder}
        />

        {toolbar && <div className={styles.calendarToolbarSlot}>{toolbar}</div>}

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
                    onDragStart={onDragStart}
                    onDropItem={handleDropItem}
                    onOpenDay={setSelectedDayKey}
                    onOpenDetail={setSelectedDetailOrder}
                    onSetDropTarget={setDropTargetDate}
                  />
                ))}
              </div>
            </div>

            <PendingOrdersTray
              draggedItemId={draggedItemId}
              items={pendingItems}
              onDragEnd={handleDragEnd}
              onDragStart={onDragStart}
              onOpenDetail={setSelectedDetailOrder}
            />
          </div>
        </section>
      </div>

      <DayOrdersModal
        dateKey={selectedDayKey}
        draggedItemId={draggedItemId}
        items={selectedDayItems}
        onClose={() => setSelectedDayKey(null)}
        onDragEnd={handleDragEnd}
        onDragStart={onDragStart}
        onOpenDetail={setSelectedDetailOrder}
      />
      <OrderDetailModal
        order={selectedDetailOrder}
        onClose={() => setSelectedDetailOrder(null)}
      />
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
