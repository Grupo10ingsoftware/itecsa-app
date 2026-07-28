import SampleHistoryItem from './SampleHistoryItem'
import styles from './SampleHistoryList.module.css'

export default function SampleHistoryList({ samples }) {
  const sortedSamples = [...samples].sort((a, b) => Number(b.version) - Number(a.version))

  return (
    <section className={styles.historySection} aria-label="Historial completo de muestras">
      <header className={styles.sectionHeader}>
        <div>
          <span>Versiones</span>
          <h2>Historial de muestras</h2>
        </div>
        <strong>{samples.length}</strong>
      </header>

      {sortedSamples.length > 0 ? (
        <div className={styles.sampleList}>
          {sortedSamples.map((sample) => (
            <SampleHistoryItem key={sample.id} sample={sample} />
          ))}
        </div>
      ) : (
        <div className={styles.emptySamples}>
          <i className="bi bi-images" aria-hidden="true" />
          <span>Este pedido todavia no tiene muestras registradas.</span>
        </div>
      )}
    </section>
  )
}
