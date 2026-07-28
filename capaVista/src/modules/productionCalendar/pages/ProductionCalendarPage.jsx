import { useMemo, useState } from 'react'
import CalendarFilters from '../components/CalendarFilters'
import CalendarHeader from '../components/CalendarHeader'
import CalendarLegend from '../components/CalendarLegend'
import CalendarSummaryCards from '../components/CalendarSummaryCards'
import CalendarToolbar from '../components/CalendarToolbar'
import DeliveryDateModal from '../components/DeliveryDateModal'
import ProductionCalendarGrid from '../components/ProductionCalendarGrid'
import { PRODUCTION_CALENDAR_ITEMS, PRODUCTION_STATUSES } from '../mocks/productionCalendar.mock'
import { isLanyardItem, isSameMonth } from '../utils/calendarUtils'
import styles from './ProductionCalendarPage.module.css'

const LANYARD_DAILY_CAPACITY = 1200
const DEFAULT_FILTERS = Object.freeze({
  search: '',
  status: '',
  productType: '',
})

function calculateOperationalLoad(items) {
  const lanyardsInProduction = items
    .filter((item) => item.status === PRODUCTION_STATUSES.IN_PRODUCTION && isLanyardItem(item))
    .reduce((total, item) => total + Number(item.quantity ?? 0), 0)

  return {
    capacity: LANYARD_DAILY_CAPACITY,
    lanyardsInProduction,
    percentage: Math.round((lanyardsInProduction / LANYARD_DAILY_CAPACITY) * 100),
  }
}

export default function ProductionCalendarPage() {
  const [monthDate, setMonthDate] = useState(() => new Date(2026, 5, 1))
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false)

  const visibleMonthItems = useMemo(
    () => PRODUCTION_CALENDAR_ITEMS.filter((item) => isSameMonth(item.dueDate, monthDate)),
    [monthDate],
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

  const operationalLoad = useMemo(() => calculateOperationalLoad(filteredItems), [filteredItems])

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
            <ProductionCalendarGrid items={filteredItems} monthDate={monthDate} />
          </section>

          <CalendarLegend onOpenDeliveryModal={() => setIsDeliveryModalOpen(true)} />
        </div>
      </section>

      <DeliveryDateModal
        isOpen={isDeliveryModalOpen}
        items={filteredItems}
        onClose={() => setIsDeliveryModalOpen(false)}
      />
    </main>
  )
}
