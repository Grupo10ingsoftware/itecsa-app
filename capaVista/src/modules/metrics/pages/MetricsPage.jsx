import { useMemo, useState } from 'react'
import { PRODUCTION_STATUSES } from '../../productionCalendar/mocks/productionCalendar.mock'
import styles from './MetricsPage.module.css'

const MOCK_ORDERS = [
  {
    id: 1,
    orderNumber: 'NV-2026-1001',
    clientName: 'Cliente Demo',
    productType: 'Lanyard',
    quantity: 420,
    status: PRODUCTION_STATUSES.IN_PRODUCTION,
    dueDate: '2026-09-04',
  },
  {
    id: 2,
    orderNumber: 'NV-2026-1002',
    clientName: 'TOTALPACK',
    productType: 'Tarjeta',
    quantity: 820,
    status: PRODUCTION_STATUSES.READY_DELIVERY,
    dueDate: '2026-09-08',
  },
  {
    id: 3,
    orderNumber: 'NV-2026-1003',
    clientName: 'Cliente ABC',
    productType: 'Lanyard',
    quantity: 300,
    status: PRODUCTION_STATUSES.PAYMENT_CONFIRMATION,
    dueDate: '2026-09-12',
  },
]

function SummaryCard({ icon, label, value, subtitle }) {
  return (
    <article className={styles.summaryCard}>
      <div className={styles.summaryIcon}>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </div>

      <div>
        <span className={styles.summaryLabel}>{label}</span>
        <strong className={styles.summaryValue}>{value}</strong>
        <span className={styles.summarySubtitle}>{subtitle}</span>
      </div>
    </article>
  )
}

export default function MetricsPage() {
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  })

  const filteredOrders = useMemo(() => {
    return MOCK_ORDERS.filter((order) => {
      const matchesFromDate =
        !dateRange.from || order.dueDate >= dateRange.from

      const matchesToDate =
        !dateRange.to || order.dueDate <= dateRange.to

      return matchesFromDate && matchesToDate
    })
  }, [dateRange])

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length

    const totalUnits = filteredOrders.reduce(
      (sum, order) => sum + order.quantity,
      0,
    )

    const completedOrders = filteredOrders.filter(
      (order) => order.status === PRODUCTION_STATUSES.READY_DELIVERY,
    ).length

    const compliance = totalOrders
      ? Math.round((completedOrders / totalOrders) * 100)
      : 0

    return {
      totalOrders,
      totalUnits,
      completedOrders,
      compliance,
    }
  }, [filteredOrders])

  function updateDate(name, value) {
    setDateRange((currentRange) => ({
      ...currentRange,
      [name]: value,
    }))
  }

  function clearDates() {
    setDateRange({
      from: '',
      to: '',
    })
  }

  return (
    <main className={`container-fluid ${styles.page}`}>
      <section className={styles.dashboardShell}>
        <header className={styles.hero}>
          <div>
            <span className={styles.sectionLabel}>Producción</span>

            <h1 className={styles.pageTitle}>Métricas</h1>

            <p className={styles.pageSubtitle}>
              Indicadores generales de producción y cumplimiento.
            </p>
          </div>

          <button className={styles.exportButton} type="button">
            <i className="bi bi-download" aria-hidden="true" />
            Exportar reporte
          </button>
        </header>

        <div className={styles.content}>
          <section className={styles.dateFilters} aria-label="Rango de fechas">
            <label>
              <span>Desde</span>

              <input
                max={dateRange.to || undefined}
                onChange={(event) => updateDate('from', event.target.value)}
                type="date"
                value={dateRange.from}
              />
            </label>

            <label>
              <span>Hasta</span>

              <input
                min={dateRange.from || undefined}
                onChange={(event) => updateDate('to', event.target.value)}
                type="date"
                value={dateRange.to}
              />
            </label>

            <button onClick={clearDates} type="button">
              <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
              Restablecer fechas
            </button>
          </section>

          <section className={styles.summaryGrid} aria-label="Resumen de métricas">
            <SummaryCard
              icon="bi-receipt"
              label="Órdenes totales"
              value={metrics.totalOrders}
              subtitle="Pedidos filtrados"
            />

            <SummaryCard
              icon="bi-box-seam"
              label="Unidades"
              value={metrics.totalUnits.toLocaleString('es-CL')}
              subtitle="Cantidad total"
            />

            <SummaryCard
              icon="bi-check2-circle"
              label="Entregadas"
              value={metrics.completedOrders}
              subtitle="Órdenes finalizadas"
            />

            <SummaryCard
              icon="bi-graph-up-arrow"
              label="Cumplimiento"
              value={`${metrics.compliance}%`}
              subtitle="Sobre órdenes filtradas"
            />
          </section>

          <section className={styles.panelsGrid}>
            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Distribución</span>
                  <h2>Órdenes por estado</h2>
                </div>

                <i className="bi bi-bar-chart" aria-hidden="true" />
              </header>

              <div className={styles.statusList}>
                {Object.values(PRODUCTION_STATUSES).map((status) => {
                  const count = filteredOrders.filter(
                    (order) => order.status === status,
                  ).length

                  return (
                    <div className={styles.statusRow} key={status}>
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                  )
                })}
              </div>
            </article>

            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Producción</span>
                  <h2>Volumen por producto</h2>
                </div>

                <i className="bi bi-boxes" aria-hidden="true" />
              </header>

              <div className={styles.productList}>
                {['Lanyard', 'Tarjeta'].map((productType) => {
                  const quantity = filteredOrders
                    .filter((order) => order.productType === productType)
                    .reduce((sum, order) => sum + order.quantity, 0)

                  return (
                    <div className={styles.productRow} key={productType}>
                      <span>{productType}</span>
                      <strong>{quantity.toLocaleString('es-CL')}</strong>
                    </div>
                  )
                })}
              </div>
            </article>
          </section>

          <section className={styles.tablePanel}>
            <header className={styles.panelHeader}>
              <div>
                <span className={styles.panelEyebrow}>Detalle</span>
                <h2>Pedidos considerados</h2>
              </div>

              <span className={styles.resultCount}>
                {filteredOrders.length} resultados
              </span>
            </header>

            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Nota de venta</th>
                    <th>Cliente</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Estado</th>
                    <th>Entrega</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.orderNumber}</strong>
                      </td>

                      <td>{order.clientName}</td>
                      <td>{order.productType}</td>
                      <td>{order.quantity.toLocaleString('es-CL')}</td>

                      <td>
                        <span className={styles.statusBadge}>
                          {order.status}
                        </span>
                      </td>

                      <td>{order.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <p className={styles.emptyState}>
                  No existen pedidos para el rango seleccionado.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}