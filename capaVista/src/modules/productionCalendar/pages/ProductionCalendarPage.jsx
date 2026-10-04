import { useEffect, useMemo, useState } from 'react'
import CalendarFilters from '../components/CalendarFilters'
import CalendarHeader from '../components/CalendarHeader'
import CalendarToolbar from '../components/CalendarToolbar'
import ProductionCalendarGrid from '../components/ProductionCalendarGrid'
import { useOrdersCalendarApi } from '../hooks/useOrdersCalendarApi'
import { loadCalendarMonth, loadUnscheduledOrders } from '../api/ordersCalendarApi'
import { getCalendarOrderQuantity, getCalendarOrderStatus } from '../utils/calendarOrder'
import styles from './ProductionCalendarPage.module.css'

const DEFAULT_FILTERS = Object.freeze({
  search: '',
  status: '',
  productType: '',
})

function toCalendarDateKey(value) {
  return value ? String(value).slice(0, 10) : ''
}

function monthRange(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const key = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return { from: key(first), to: key(last) }
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getOrderProductNames(order) {
  const sourceItems = Array.isArray(order.items) ? order.items : []

  const productNames = sourceItems
    .map((item) => item.product)
    .filter(Boolean)

  return [...new Set([
    order.product,
    ...productNames,
  ].filter(Boolean))]
}

function normalizeCalendarOrder(order) {
  const productNames = getOrderProductNames(order)
  const items = (Array.isArray(order.items) ? order.items : []).map((item) => ({
    ...item,
    dueDate: toCalendarDateKey(item.dueDate),
  }))

  return {
    ...order,
    id: order.id,
    orderNumber: order.salesNoteNumber,
    clientName: order.clientName ?? 'Cliente sin nombre',
    productType: productNames[0] ?? 'Producto no definido',
    productTypes: productNames,
    quantity: getCalendarOrderQuantity(items),
    items,
    status: getCalendarOrderStatus(order),
    dueDate: toCalendarDateKey(order.dueDate),
  }
}

export default function ProductionCalendarPage() {
  const ordersCalendarApi = useOrdersCalendarApi()
  const [calendarItems, setCalendarItems] = useState([])
  const [unscheduledItems, setUnscheduledItems] = useState([])
  const [monthDate, setMonthDate] = useState(() => {
    const today = new Date()

    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [draggedItemId, setDraggedItemId] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadOrders() {
      try {
        setLoadError(null)
        const orders = await loadCalendarMonth(ordersCalendarApi, monthRange(monthDate), () => isMounted)

        if (isMounted) {
          setCalendarItems(Array.isArray(orders)
            ? orders
                .filter((order) => order?.salesNoteNumber)
                .map(normalizeCalendarOrder)
            : [])
        }
      } catch {
        if (isMounted) {
          setLoadError('No fue posible cargar los pedidos compartidos del calendario.')
        }
      }
    }

    loadOrders()

    return () => {
      isMounted = false
    }
  }, [monthDate, ordersCalendarApi])

  useEffect(() => {
    let isMounted = true
    loadUnscheduledOrders(ordersCalendarApi, () => isMounted)
      .then((orders) => {
        if (isMounted) setUnscheduledItems(orders.filter((order) => order?.salesNoteNumber).map(normalizeCalendarOrder))
      })
      .catch(() => {
        if (isMounted) setLoadError('No fue posible cargar los pedidos pendientes de fecha.')
      })
    return () => { isMounted = false }
  }, [ordersCalendarApi])

  useEffect(() => {
    if (!draggedItemId) return undefined

    function clearDraggedItem() {
      setDraggedItemId(null)
    }

    window.addEventListener('dragend', clearDraggedItem)
    window.addEventListener('drop', clearDraggedItem)

    return () => {
      window.removeEventListener('dragend', clearDraggedItem)
      window.removeEventListener('drop', clearDraggedItem)
    }
  }, [draggedItemId])

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeText(filters.search)
    const normalizedProductType = normalizeText(filters.productType)

    return calendarItems.filter((item) => {
      const searchableProductNames = Array.isArray(item.productTypes) ? item.productTypes : [item.productType]
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalizeText([item.orderNumber, item.clientName, ...searchableProductNames].join(' ')).includes(normalizedSearch)
      const matchesStatus = !filters.status || item.status === filters.status
      const matchesProduct =
        !normalizedProductType ||
        searchableProductNames.some((productName) => normalizeText(productName) === normalizedProductType)

      return matchesSearch && matchesStatus && matchesProduct
    })
  }, [calendarItems, filters])

  function changeMonth(offset) {
    setMonthDate((currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))
  }

  function updateFilters(nextFilters) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...nextFilters,
    }))
  }

  async function updateItemDeliveryDate(itemId, nextDate, credentials) {
    const normalizedOrder = normalizeCalendarOrder(await ordersCalendarApi.updateDeliveryDate(itemId, nextDate, credentials))

    setCalendarItems((currentItems) =>
      currentItems.some((item) => String(item.id) === String(itemId))
        ? currentItems.map((item) => (String(item.id) === String(itemId) ? normalizedOrder : item))
        : [...currentItems, normalizedOrder],
    )
    setUnscheduledItems((currentItems) => currentItems.filter((item) => String(item.id) !== String(itemId)))
  }

  async function getOrderDetail(orderId) {
    return normalizeCalendarOrder(await ordersCalendarApi.getOrderDetail(orderId))
  }

  return (
    <main className={`container-fluid ${styles.page}`}>
      <section className={styles.dashboardShell}>
        <CalendarHeader
          isFiltersOpen={isFiltersOpen}
          onToggleFilters={() => setIsFiltersOpen((currentValue) => !currentValue)}
        />

        <div className={styles.content}>
          {isFiltersOpen && (
            <CalendarFilters
              filters={filters}
              onChange={updateFilters}
              onClear={() => setFilters(DEFAULT_FILTERS)}
            />
          )}

          {loadError && <div className="alert alert-warning mb-0">{loadError}</div>}

          <section className={styles.calendarPanel}>
            <ProductionCalendarGrid
              getOrderDetail={getOrderDetail}
              allItems={[...calendarItems, ...unscheduledItems.filter((item) => !calendarItems.some((monthItem) => String(monthItem.id) === String(item.id)))]}
              draggedItemId={draggedItemId}
              items={filteredItems}
              monthDate={monthDate}
              onChangeDeliveryDate={updateItemDeliveryDate}
              onDragEnd={() => setDraggedItemId(null)}
              onDragStart={setDraggedItemId}
              toolbar={(
                <CalendarToolbar
                  monthDate={monthDate}
                  onNextMonth={() => changeMonth(1)}
                  onPreviousMonth={() => changeMonth(-1)}
                />
              )}
            />
          </section>
        </div>
      </section>
    </main>
  )
}
