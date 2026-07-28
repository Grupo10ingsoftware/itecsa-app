import { formatDate, formatQuantity, specificationsToList } from '../utils/productionHistoryFormatters'
import StatusPill from './StatusPill'
import styles from './OrderHistorySummary.module.css'

export default function OrderHistorySummary({ order }) {
  const finalSample = order.samples.find((sample) => sample.isFinal) ?? null
  const highlightedSample = finalSample ?? order.samples[0] ?? null
  const specificationItems = specificationsToList(highlightedSample?.specifications)

  return (
    <section className={styles.summaryGrid} aria-label="Resumen del pedido y muestra definitiva">
      <article className={styles.samplePreview}>
        <header className={styles.cardHeader}>
          <span>Muestra digital</span>
          {highlightedSample ? <StatusPill status={highlightedSample.status} /> : <StatusPill status="Sin muestra" />}
        </header>
        {highlightedSample ? (
          <img alt={`Muestra ${highlightedSample.version} de ${order.orderNumber}`} src={highlightedSample.imageUrl} />
        ) : (
          <div className={styles.emptyPreview}>Sin muestra registrada</div>
        )}
      </article>

      <article className={styles.infoCard}>
        <header className={styles.cardHeader}>
          <span>Fabricacion</span>
          <i className="bi bi-tools" aria-hidden="true" />
        </header>
        <dl className={styles.dataList}>
          {specificationItems.length > 0 ? (
            specificationItems.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))
          ) : (
            <div>
              <dt>Especificaciones</dt>
              <dd>No disponibles</dd>
            </div>
          )}
        </dl>
      </article>

      <article className={styles.infoCard}>
        <header className={styles.cardHeader}>
          <span>Pedido</span>
          <i className="bi bi-receipt" aria-hidden="true" />
        </header>
        <dl className={styles.dataList}>
          <div>
            <dt>Numero</dt>
            <dd>{order.orderNumber}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{order.clientName}</dd>
          </div>
          <div>
            <dt>RUT</dt>
            <dd>{order.clientRut}</dd>
          </div>
          <div>
            <dt>Vendedor</dt>
            <dd>{order.sellerName}</dd>
          </div>
          <div>
            <dt>Cantidad</dt>
            <dd>{formatQuantity(order.quantity)}</dd>
          </div>
          <div>
            <dt>Producto</dt>
            <dd>{order.productType}</dd>
          </div>
        </dl>
      </article>

      <article className={styles.infoCard}>
        <header className={styles.cardHeader}>
          <span>Responsables</span>
          <i className="bi bi-person-check" aria-hidden="true" />
        </header>
        <dl className={styles.dataList}>
          <div>
            <dt>Creacion muestra</dt>
            <dd>{highlightedSample?.responsible ?? 'No disponible'}</dd>
          </div>
          <div>
            <dt>Aprobacion</dt>
            <dd>{highlightedSample?.reviewer ?? 'No disponible'}</dd>
          </div>
          <div>
            <dt>Fecha pedido</dt>
            <dd>{formatDate(order.createdAt)}</dd>
          </div>
          <div>
            <dt>Estado pedido</dt>
            <dd>{order.orderStatus ?? 'Sin estado'}</dd>
          </div>
        </dl>
      </article>
    </section>
  )
}
