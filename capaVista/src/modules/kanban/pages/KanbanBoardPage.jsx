import { useCallback, useState } from 'react'
import KanbanColumn from '../components/KanbanColumn'
import KanbanFilters from '../components/KanbanFilters'
import styles from './KanbanBoardPage.module.css'

export default function KanbanBoardPage() {
  const [appliedFilters, setAppliedFilters] = useState({})
  const [operationalLoad, setOperationalLoad] = useState({
    capacity: 1200,
    lanyardsInProduction: 0,
    percentage: 0,
  })
  const loadLevel =
    operationalLoad.percentage > 100
      ? 'overloaded'
      : operationalLoad.percentage >= 71
        ? 'warning'
        : 'normal'
  const progressWidth = `${Math.min(operationalLoad.percentage, 100)}%`
  const handleOperationalLoadChange = useCallback((nextLoad) => {
    setOperationalLoad(nextLoad)
  }, [])

  return (
    <main className={`container-fluid ${styles.page}`}>
      <section className={styles.dashboardShell}>
        <header className={styles.hero}>
          <div>
            <span className={styles.sectionLabel}>Produccion</span>
            <h1 className={styles.pageTitle}>Kanban</h1>
            <p className={styles.pageSubtitle}>
              Vista principal de seguimiento de produccion con arrastre de ordenes entre estados.
            </p>
          </div>
          <aside className={`${styles.capacityMeter} ${styles[loadLevel]}`} aria-label="Carga Operativa">
            <div className={styles.capacityHeader}>
              <span>Carga Operativa</span>
              <strong>{operationalLoad.percentage}%</strong>
            </div>
            <div className={styles.capacityNumbers}>
              <strong>{operationalLoad.lanyardsInProduction}</strong>
              <span>/ {operationalLoad.capacity} lanyards por dia</span>
            </div>
            <div className={styles.capacityTrack} aria-hidden="true">
              <span className={styles.capacityFill} style={{ width: progressWidth }} />
            </div>
            <p>Solo pedidos lanyard en En produccion.</p>
          </aside>
        </header>

        <div className={styles.content}>
          <KanbanFilters
            onApplyFilters={(nextFilters) => setAppliedFilters(nextFilters)}
            onClearFilters={() => setAppliedFilters({})}
          />
          <KanbanColumn filters={appliedFilters} onOperationalLoadChange={handleOperationalLoadChange} />
        </div>
      </section>
    </main>
  )
}
