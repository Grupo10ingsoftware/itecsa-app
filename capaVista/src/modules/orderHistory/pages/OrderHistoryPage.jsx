import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../config/routes'
import { useOrderHistoryApi } from '../hooks/useOrderHistoryApi'
import { formatDate } from '../utils/orderHistoryFormatters'
import styles from './OrderHistoryPage.module.css'

const STATUS_FILTERS = [
  { label: 'Confirmación de Pago', value: 'Confirmación de Pago' },
  { label: 'Listo para producción', value: 'Listo para Producción' },
  { label: 'En producción', value: 'En producción' },
  { label: 'Listo para despacho', value: 'Listo para Entrega' },
  { label: 'Finalizado', value: 'Terminado' },
  { label: 'Cancelado', value: 'Cancelado' },
]

function errorMessage(error) {
  return error?.payload?.message ?? 'No fue posible cargar el historial de pedidos.'
}

export default function OrderHistoryPage() {
  const api = useOrderHistoryApi()
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.listOrders({ status, search, from: dateRange.from, to: dateRange.to, page, perPage: 20 })
      .then((result) => {
        if (!active) return
        setOrders(result.orders ?? [])
        setMeta({ total: result.total ?? 0, totalPages: result.totalPages ?? 0 })
      })
      .catch((requestError) => active && setError(errorMessage(requestError)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [api, dateRange.from, dateRange.to, page, search, status])

  function updateDate(name, value) {
    setLoading(true)
    setError('')
    setPage(1)
    setDateRange((current) => ({ ...current, [name]: value }))
  }

  function submitSearch(event) {
    event.preventDefault()
    const nextSearch = searchInput.trim()
    if (nextSearch === search) return
    setLoading(true)
    setError('')
    setPage(1)
    setSearch(nextSearch)
  }

  function selectStatus(nextStatus) {
    const resolvedStatus = status === nextStatus ? '' : nextStatus
    if (resolvedStatus === status) return
    setLoading(true)
    setError('')
    setPage(1)
    setStatus(resolvedStatus)
  }

  function changePage(nextPage) {
    setLoading(true)
    setError('')
    setPage(nextPage)
  }

  const noRegisteredOrders = !loading && !error && meta.total === 0 && !status && !search && !dateRange.from && !dateRange.to

  return (
    <main className={`container-fluid ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span>Registro de actividades</span>
          <h1>Historial de pedidos</h1>
          <p>Consulta pedidos y revisa su trazabilidad consolidada.</p>
        </div>
        <strong>{meta.total} pedidos</strong>
      </header>

      <section className={styles.panel}>
        <div className={styles.statusFilters} aria-label="Filtros por estado">
          <button className={!status ? styles.activeFilter : ''} onClick={() => selectStatus('')} type="button">Todos</button>
          {STATUS_FILTERS.map((item) => (
            <button className={status === item.value ? styles.activeFilter : ''} key={item.value} onClick={() => selectStatus(item.value)} type="button">
              {item.label}
            </button>
          ))}
        </div>

        <form className={styles.search} onSubmit={submitSearch}>
          <i className="bi bi-search" aria-hidden="true" />
          <input
            aria-label="Buscar pedidos"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nota de Venta, RUT o nombre del cliente"
            type="search"
            value={searchInput}
          />
          <button type="submit">Buscar</button>
        </form>

        <div className={styles.dateFilters} aria-label="Rango de fecha de creacion">
          <label>
            <span>Desde</span>
            <input max={dateRange.to || undefined} onChange={(event) => updateDate('from', event.target.value)} type="date" value={dateRange.from} />
          </label>
          <label>
            <span>Hasta</span>
            <input min={dateRange.from || undefined} onChange={(event) => updateDate('to', event.target.value)} type="date" value={dateRange.to} />
          </label>
          <button onClick={() => setDateRange({ from: '', to: '' })} type="button">
            <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Restablecer fechas
          </button>
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}
        {loading ? (
          <div className={styles.state}>Cargando pedidos…</div>
        ) : orders.length === 0 ? (
          <div className={styles.state}>{noRegisteredOrders ? 'No existen pedidos hasta el momento' : 'No se encontraron pedidos'}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Nota de Venta</th><th>RUT cliente</th><th>Cliente</th><th>Estado actual</th><th>Fecha creación</th><th>Acción</th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.salesNoteNumber ?? `Pedido #${order.id}`}</strong></td>
                    <td>{order.clientRut ?? 'No disponible'}</td>
                    <td>{order.clientName ?? 'No disponible'}</td>
                    <td><span className={styles.status}>{order.status ?? 'Sin estado'}</span></td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <Link className={styles.detailButton} to={APP_ROUTES.ORDER_HISTORY_DETAIL.replace(':orderId', order.id)}>
                        Ver detalle <i className="bi bi-arrow-right" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <nav className={styles.pagination} aria-label="Paginación">
            <button disabled={page === 1} onClick={() => changePage(page - 1)} type="button">Anterior</button>
            <span>Página {page} de {meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} onClick={() => changePage(page + 1)} type="button">Siguiente</button>
          </nav>
        )}
      </section>
    </main>
  )
}
