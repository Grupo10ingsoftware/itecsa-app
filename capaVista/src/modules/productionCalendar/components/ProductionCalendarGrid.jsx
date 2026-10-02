import { TransferOrdersTray, PendingOrdersTray } from './CalendarOrderTrays.jsx';
import { CalendarDayCell } from './CalendarDayCell.jsx';
import { DayOrdersModal } from './DayOrdersModal.jsx';
import { OrderDetailModal } from './CalendarOrderDetailModal.jsx';
import { DeliveryChangeConfirmModal, DeliveryChangeCredentialsModal } from './DeliveryChangeModals.jsx';
import { useState, useMemo } from 'react';
import { buildMonthGrid, isBusinessDateKey, isSameMonth, groupItemsByDate, WEEK_DAYS } from '../utils/calendarUtils';
import { useAuth } from '../../../hooks/useAuth';
import { PERMISSIONS } from '../../../config/permissions';
import styles from './ProductionCalendarGrid.module.css';

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

  const [previousSourceItems, setPreviousSourceItems] = useState(sourceItems)
  if (sourceItems !== previousSourceItems) {
    const sourceItemIds = new Set(sourceItems.map((item) => String(item.id)))
    setPreviousSourceItems(sourceItems)
    setTransferItemIds((currentIds) => currentIds.filter((itemId) => sourceItemIds.has(String(itemId))))
  }

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
