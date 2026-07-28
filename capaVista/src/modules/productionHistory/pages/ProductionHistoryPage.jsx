import { useMemo, useState } from 'react'
import ProductionHistoryFilters from '../components/ProductionHistoryFilters'
import ProductionHistoryTable from '../components/ProductionHistoryTable'
import { getProductionHistoryOrders } from '../mocks/productionHistory.mock'
import styles from './ProductionHistoryPage.module.css'

const PAGE_SIZE = 3

export default function ProductionHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const orders = useMemo(() => getProductionHistoryOrders(), [])

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) return orders

    return orders.filter((order) =>
      [
        order.orderNumber,
        order.managerOrderId,
        order.productType,
        order.clientName,
        order.clientRut,
        order.sellerName,
        order.orderStatus,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    )
  }, [orders, searchTerm])

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, pageCount)
  const paginatedOrders = filteredOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleSearchChange(nextSearchTerm) {
    setSearchTerm(nextSearchTerm)
    setCurrentPage(1)
  }

  return (
    <main className={`container-fluid ${styles.page}`}>
      <section className={styles.dashboardShell}>
        <header className={styles.hero}>
          <div>
            <span className={styles.sectionLabel}>Produccion</span>
            <h1 className={styles.pageTitle}>Historial de Produccion</h1>
            <p className={styles.pageSubtitle}>
              Prototipo navegable con pedidos mock, busqueda, paginacion y detalle dinamico de muestras.
            </p>
          </div>
        </header>

        <ProductionHistoryFilters
          currentPage={safePage}
          onPageChange={setCurrentPage}
          onSearchChange={handleSearchChange}
          pageCount={pageCount}
          searchTerm={searchTerm}
          total={filteredOrders.length}
        />

        <ProductionHistoryTable orders={paginatedOrders} />
      </section>
    </main>
  )
}
