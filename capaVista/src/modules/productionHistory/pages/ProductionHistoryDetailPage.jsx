import { Link, useParams } from 'react-router-dom'
import { APP_ROUTES } from '../../../config/routes'
import OrderHistorySummary from '../components/OrderHistorySummary'
import SampleHistoryList from '../components/SampleHistoryList'
import { getProductionHistoryOrderById } from '../mocks/productionHistory.mock'
import styles from './ProductionHistoryDetailPage.module.css'

export default function ProductionHistoryDetailPage() {
  const { pedidoId } = useParams()
  const order = getProductionHistoryOrderById(pedidoId)

  if (!order) {
    return (
      <main className={`container-fluid ${styles.page}`}>
        <section className={styles.notFoundState}>
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <h1>Pedido no encontrado</h1>
          <p>No existe un pedido mock con el identificador solicitado.</p>
          <Link className={styles.backButton} to={APP_ROUTES.PRODUCTION_HISTORY}>
            Volver al historial
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className={`container-fluid ${styles.page}`}>
      <section className={styles.dashboardShell}>
        <header className={styles.hero}>
          <div>
            <span className={styles.sectionLabel}>Detalle historial</span>
            <h1 className={styles.pageTitle}>{order.orderNumber}</h1>
            <p className={styles.pageSubtitle}>
              {order.clientName} · {order.productType}
            </p>
          </div>
          <Link className={styles.backButton} to={APP_ROUTES.PRODUCTION_HISTORY}>
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Volver
          </Link>
        </header>

        <div className={styles.content}>
          <OrderHistorySummary order={order} />
          <SampleHistoryList samples={order.samples} />
        </div>
      </section>
    </main>
  )
}
