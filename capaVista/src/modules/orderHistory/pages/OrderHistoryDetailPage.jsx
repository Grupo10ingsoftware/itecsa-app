import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { APP_ROUTES } from '../../../config/routes'
import { useOrderHistoryApi } from '../hooks/useOrderHistoryApi'
import { formatDate, formatDateTime, formatDuration } from '../utils/orderHistoryFormatters'
import styles from './OrderHistoryDetailPage.module.css'

const EVENT_TYPES = [
  ['all', 'Todos los registros'],
  ['stage', 'Etapas generales'],
  ['payment', 'Pagos'],
  ['subprocess', 'Subprocesos'],
  ['calendar', 'Calendarizacion'],
  ['general', 'Generales'],
]

export default function OrderHistoryDetailPage() {
  const { orderId } = useParams()
  const api = useOrderHistoryApi()
  const [type, setType] = useState('all')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.getOrderHistory(orderId, type)
      .then((result) => active && setOrder(result))
      .catch((requestError) => active && setError(requestError?.payload?.message ?? 'No fue posible cargar el historial.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [api, orderId, type])

  function selectType(nextType) {
    setLoading(true)
    setError('')
    setType(nextType)
  }

  if (loading && !order) return <main className={styles.state}>Cargando historial…</main>
  if (error && !order) return <main className={styles.state}><p>{error}</p><Link to={APP_ROUTES.ORDER_HISTORY}>Volver al historial</Link></main>

  return (
    <main className={`container-fluid ${styles.page}`}>
      <header className={styles.hero}>
        <div><span>Historial consolidado</span><h1>{order?.salesNoteNumber ?? `Pedido #${orderId}`}</h1><p>{order?.client.name ?? 'Cliente no disponible'}</p></div>
        <Link to={APP_ROUTES.ORDER_HISTORY}><i className="bi bi-arrow-left" aria-hidden="true" /> Volver</Link>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {order && (
        <>
          <section className={styles.summary} aria-label="Información del pedido">
            <article><span>Estado actual</span><strong>{order.status ?? 'Sin estado'}</strong><small>Pago: {order.paymentStatus ?? 'Sin estado'}</small></article>
            <article><span>Cliente</span><strong>{order.client.name ?? 'No disponible'}</strong></article>
            <article><span>Vendedor asociado</span><strong>{order.seller.name ?? 'No disponible'}</strong></article>
            <article><span>Fecha de creación</span><strong>{formatDate(order.createdAt)}</strong><small>Entrega: {formatDate(order.estimatedCompletionAt)}</small></article>
          </section>

          <section className={styles.products}>
            <h2>Productos del pedido</h2>
            {order.items.length === 0 ? <p>Sin productos registrados.</p> : (
              <div className={styles.productGrid}>{order.items.map((item) => (
                <article key={item.id}><strong>{item.productType ?? 'Producto'}</strong><span>Cantidad: {item.quantity ?? 'No disponible'}</span>{item.subprocessStatus && <small>Subproceso: {item.subprocessStatus}</small>}</article>
              ))}</div>
            )}
          </section>

          <section className={styles.timelineSection}>
            <header><div><span>Actividad</span><h2>Eventos del pedido</h2></div>
              <select aria-label="Filtrar por tipo de registro" onChange={(event) => selectType(event.target.value)} value={type}>
                {EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </header>
            {loading ? <div className={styles.empty}>Actualizando eventos…</div> : order.events.length === 0 ? <div className={styles.empty}>No existen registros para este filtro.</div> : (
              <ol className={styles.timeline}>{order.events.map((event) => (
                <li key={event.id}>
                  <div className={styles.marker}><i className="bi bi-clock-history" aria-hidden="true" /></div>
                  <article>
                    <span className={styles.type}>{event.typeLabel}</span>
                    <h3>{event.title}</h3>
                    <time>{formatDateTime(event.occurredAt)}</time>
                    <p>Responsable: {event.responsible ?? 'No disponible'}</p>
                    {event.description && <p>{event.description}</p>}
                    {event.productType && <p>Producto: {event.productType}</p>}
                    {event.lanyardProgress && (
                      <p>
                        Avance producido: {event.lanyardProgress.accumulatedQuantity ?? 0}
                        {event.lanyardProgress.totalQuantity ? ` / ${event.lanyardProgress.totalQuantity}` : ''}
                        {' '}lanyards ({event.lanyardProgress.percentage}%)
                      </p>
                    )}
                    {event.type === 'payment' && (
                      <p>{event.previousStatus ?? 'Estado anterior desconocido'} → {event.nextStatus ?? 'Sin estado'}</p>
                    )}
                    {formatDuration(event.durationSeconds) && (
                      <strong>
                        Tiempo transcurrido{event.isOngoing ? ' (en curso)' : ''}: {formatDuration(event.durationSeconds)}
                      </strong>
                    )}
                  </article>
                </li>
              ))}</ol>
            )}
          </section>
        </>
      )}
    </main>
  )
}
