import { useMemo, useState } from 'react'
import CalendarFilters from '../components/CalendarFilters'
import CalendarHeader from '../components/CalendarHeader'
import CalendarSummaryCards from '../components/CalendarSummaryCards'
import CalendarToolbar from '../components/CalendarToolbar'
import ProductionCalendarGrid from '../components/ProductionCalendarGrid'
import { PRODUCTION_CALENDAR_ITEMS } from '../mocks/productionCalendar.mock'
import { buildMonthGrid, isSameMonth, toDateKey } from '../utils/calendarUtils'
import { LANYARD_DAILY_CAPACITY, calculateOperationalLoadByDate } from '../utils/operationalLoadUtils'
import styles from './ProductionCalendarPage.module.css'

const DEFAULT_FILTERS = Object.freeze({
  search: '',
  status: '',
  productType: '',
})

export default function ProductionCalendarPage() {
  const [calendarItems, setCalendarItems] = useState(() => [...PRODUCTION_CALENDAR_ITEMS])
  const [monthDate, setMonthDate] = useState(() => new Date(2026, 5, 1))
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

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

  function updateItemDeliveryDate(itemId, nextDate) {
    setCalendarItems((currentItems) =>
      currentItems.map((item) => (item.id === itemId ? { ...item, dueDate: nextDate } : item)),
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
