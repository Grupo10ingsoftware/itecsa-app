import { useEffect, useMemo, useState } from 'react'
import CalendarFilters from '../components/CalendarFilters'
import CalendarHeader from '../components/CalendarHeader'
import CalendarSummaryCards from '../components/CalendarSummaryCards'
import CalendarToolbar from '../components/CalendarToolbar'
import ProductionCalendarGrid from '../components/ProductionCalendarGrid'
import { PRODUCTION_STATUSES } from '../mocks/productionCalendar.mock'
import { useDemoOrdersApi } from '../hooks/useDemoOrdersApi'
import { buildMonthGrid, isSameMonth, toDateKey } from '../utils/calendarUtils'
import { LANYARD_DAILY_CAPACITY, calculateOperationalLoadByDate } from '../utils/operationalLoadUtils'
import styles from './ProductionCalendarPage.module.css'

const DEFAULT_FILTERS = Object.freeze({
  search: '',
  status: '',
  productType: '',
})

function getStatusByStep(stepId) {
  const statuses = [
    PRODUCTION_STATUSES.PAYMENT_CONFIRMATION,
    PRODUCTION_STATUSES.READY_PRODUCTION,
    PRODUCTION_STATUSES.IN_PRODUCTION,
    PRODUCTION_STATUSES.READY_DELIVERY,
  ]

  return statuses[Number(stepId)] ?? PRODUCTION_STATUSES.PAYMENT_CONFIRMATION
}

function normalizeCalendarOrder(order) {
  return {
    ...order,
    id: order.id ?? order.id_pedido,
    orderNumber: order.orderNumber ?? order.nv ?? order.codigo_nota_venta,
    clientName: order.clientName ?? order.cliente ?? order.nombre_cliente ?? 'Cliente sin nombre',
    productType: order.productType ?? order.product ?? order.producto ?? 'Producto no definido',
    quantity: order.quantity ?? order.cantidad ?? 0,
    status: order.status ?? getStatusByStep(order.generalStepId ?? order.id_etapa_general),
    dueDate: order.dueDate ?? order.fecha_estimada_termino,
  }
}

export default function ProductionCalendarPage() {
  const demoOrdersApi = useDemoOrdersApi()
  const [calendarItems, setCalendarItems] = useState([])
  const [monthDate, setMonthDate] = useState(() => new Date(2026, 5, 1))
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadOrders() {
      try {
        setLoadError(null)
        const orders = await demoOrdersApi.getOrders()

        if (isMounted) {
          setCalendarItems(Array.isArray(orders) ? orders.map(normalizeCalendarOrder) : [])
        }
      } catch (error) {
        console.error('Error cargando pedidos del calendario:', error)
        if (isMounted) {
          setLoadError('No fue posible cargar los pedidos compartidos del calendario.')
        }
      }
    }

    loadOrders()

    return () => {
      isMounted = false
    }
  }, [demoOrdersApi])

  const visibleMonthItems = useMemo(
    () => calendarItems.filter((item) => isSameMonth(item.dueDate, monthDate)),
    [calendarItems, monthDate],
  )

  const filteredItems = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()

    return visibleMonthItems.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [item.orderNumber, item.clientName, item.productType].join(' ').toLowerCase().includes(normalizedSearch)
      const matchesStatus = !filters.status || item.status === filters.status
      const matchesProduct = !filters.productType || item.productType === filters.productType

      return matchesSearch && matchesStatus && matchesProduct
    })
  }, [filters, visibleMonthItems])

  const visibleDays = useMemo(() => buildMonthGrid(monthDate), [monthDate])
  const visibleDateRange = useMemo(
    () => ({
      from: visibleDays[0]?.dateKey,
      to: visibleDays.at(-1)?.dateKey,
    }),
    [visibleDays],
  )

  const operationalLoadByDate = useMemo(
    () =>
      calculateOperationalLoadByDate({
        from: visibleDateRange.from,
        items: calendarItems,
        to: visibleDateRange.to,
      }),
    [calendarItems, visibleDateRange],
  )

  const operationalLoad = useMemo(() => {
    const todayKey = toDateKey(new Date())
    const todayLoad = operationalLoadByDate.get(todayKey)

    return {
      capacity: LANYARD_DAILY_CAPACITY,
      lanyardsInProduction: todayLoad?.lanyardsLoad ?? 0,
      percentage: todayLoad?.percentage ?? 0,
    }
  }, [operationalLoadByDate])

  function changeMonth(offset) {
    setMonthDate((currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))
  }

  function goToday() {
    const today = new Date()
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  function updateFilters(nextFilters) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...nextFilters,
    }))
  }

  async function updateItemDeliveryDate(itemId, nextDate) {
    const updatedOrder = await demoOrdersApi.updateDeliveryDate(itemId, nextDate)
    const normalizedOrder = normalizeCalendarOrder(updatedOrder)

    setCalendarItems((currentItems) =>
      currentItems.map((item) => (item.id === itemId ? normalizedOrder : item)),
    )
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

          <CalendarSummaryCards items={filteredItems} load={operationalLoad} />

          <section className={styles.calendarPanel}>
            <CalendarToolbar
              monthDate={monthDate}
              onGoToday={goToday}
              onNextMonth={() => changeMonth(1)}
              onPreviousMonth={() => changeMonth(-1)}
            />
            <ProductionCalendarGrid
              items={filteredItems}
              loadByDate={operationalLoadByDate}
              monthDate={monthDate}
              onChangeDeliveryDate={updateItemDeliveryDate}
            />
          </section>
        </div>
      </section>
    </main>
  )
}
