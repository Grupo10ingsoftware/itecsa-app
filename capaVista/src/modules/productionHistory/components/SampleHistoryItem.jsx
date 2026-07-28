import { useState } from 'react'
import { formatDateTime, specificationsToList } from '../utils/productionHistoryFormatters'
import StatusPill from './StatusPill'
import styles from './SampleHistoryItem.module.css'

export default function SampleHistoryItem({ sample }) {
  const [isOpen, setIsOpen] = useState(sample.isFinal)
  const specificationItems = specificationsToList(sample.specifications)

  return (
    <article className={`${styles.sampleItem} ${sample.isFinal ? styles.finalSample : ''}`}>
      <button
        aria-expanded={isOpen}
        className={styles.sampleButton}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span className={styles.versionBadge}>V{sample.version}</span>
        <span className={styles.sampleTitle}>
          Muestra version {sample.version}
          {sample.isFinal && <strong>Muestra definitiva</strong>}
        </span>
        <StatusPill status={sample.status} />
        <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} ${styles.chevron}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className={styles.sampleBody}>
          <div className={styles.imageFrame}>
            <img alt={`Muestra version ${sample.version}`} loading="lazy" src={sample.imageUrl} />
          </div>

          <div className={styles.detailGrid}>
            <dl className={styles.dataList}>
              <div>
                <dt>Estado</dt>
                <dd>{sample.status}</dd>
              </div>
              <div>
                <dt>Creacion</dt>
                <dd>{formatDateTime(sample.createdAt)}</dd>
              </div>
              <div>
                <dt>Aprobacion/Rechazo</dt>
                <dd>{formatDateTime(sample.resolvedAt)}</dd>
              </div>
              <div>
                <dt>Responsable</dt>
                <dd>{sample.responsible ?? 'No disponible'}</dd>
              </div>
              <div>
                <dt>Revisor</dt>
                <dd>{sample.reviewer ?? 'No disponible'}</dd>
              </div>
            </dl>

            <section className={styles.textBlock}>
              <h3>Especificaciones</h3>
              <dl className={styles.specList}>
                {specificationItems.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className={styles.textBlock}>
              <h3>Observaciones</h3>
              <p>{sample.observations || 'Sin observaciones.'}</p>
              <h3>Motivo de modificacion</h3>
              <p>{sample.changeReason || 'No aplica.'}</p>
            </section>
          </div>
        </div>
      )}
    </article>
  )
}
