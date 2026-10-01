import { useEffect, useMemo, useState } from 'react'
import CalendarFilters from '../components/CalendarFilters'
import CalendarHeader from '../components/CalendarHeader'
import CalendarToolbar from '../components/CalendarToolbar'
import ProductionCalendarGrid from '../components/ProductionCalendarGrid'
import { PRODUCTION_STATUSES } from '../config/productionCalendar.config'
import { useOrdersCalendarApi } from '../hooks/useOrdersCalendarApi'
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

function toCalendarDateKey(value) {
  return value ? String(value).slice(0, 10) : ''
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getOrderProductNames(order) {
  const sourceItems = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : Array.isArray(order.detalles)
      ? order.detalles
      : []

  const productNames = sourceItems
    .map((item) => item.productType ?? item.product ?? item.nombre_producto ?? item.producto)
    .filter(Boolean)

  return [...new Set([
    order.productType ?? order.product ?? order.producto ?? order.nombre_producto,
    ...productNames,
  ].filter(Boolean))]
}

function normalizeCalendarOrder(order) {
  const productNames = getOrderProductNames(order)

  return {
    ...order,
    id: order.id ?? order.id_pedido,
    orderNumber: order.orderNumber ?? order.nv ?? order.numero_nota_venta ?? order.codigo_nota_venta,
    clientName: order.clientName ?? order.cliente ?? order.nombre_cliente ?? 'Cliente sin nombre',
    productType: productNames[0] ?? 'Producto no definido',
    productTypes: productNames,
    quantity: order.quantity ?? order.cantidad ?? 0,
    items: Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : Array.isArray(order.detalles)
        ? order.detalles
        : [],
    status: order.status ?? getStatusByStep(order.generalStepId ?? order.id_etapa_general),
    dueDate: toCalendarDateKey(order.dueDate ?? order.fecha_estimada_termino),
  }
}

export default function ProductionCalendarPage() {
  const ordersCalendarApi = useOrdersCalendarApi()
  const [calendarItems, setCalendarItems] = useState([])
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
        const orders = await ordersCalendarApi.getOrders()

        if (isMounted) {
          setCalendarItems(Array.isArray(orders)
            ? orders
                .filter((order) => order?.numero_nota_venta ?? order?.nv ?? order?.codigo_nota_venta)
                .map(normalizeCalendarOrder)
            : [])
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
    const updatedOrder = await ordersCalendarApi.updateDeliveryDate(itemId, nextDate, credentials)
    const normalizedOrder = normalizeCalendarOrder(updatedOrder)

    setCalendarItems((currentItems) =>
      currentItems.map((item) => (String(item.id) === String(itemId) ? normalizedOrder : item)),
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

          <section className={styles.calendarPanel}>
            <ProductionCalendarGrid
              allItems={calendarItems}
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
