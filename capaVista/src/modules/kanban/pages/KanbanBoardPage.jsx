import { useCallback, useState } from 'react'
import KanbanAnnouncementsOffCanvas from '../components/KanbanAnnouncementsOffCanvas'
import KanbanColumn from '../components/KanbanColumn'
import KanbanFilters from '../components/KanbanFilters'
import { useKanbanApi } from '../hooks/useKanbanApi'
import styles from './KanbanBoardPage.module.css'

export default function KanbanBoardPage() {
  const kanbanApi = useKanbanApi()
  const [appliedFilters, setAppliedFilters] = useState({})
  const [announcements, setAnnouncements] = useState([])
  const [announcementsError, setAnnouncementsError] = useState(null)
  const [announcementsOpen, setAnnouncementsOpen] = useState(false)
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)
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
  const loadAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true)
    setAnnouncementsError(null)

    try {
      const result = await kanbanApi.getAnnouncements()
      setAnnouncements(Array.isArray(result) ? result : [])
    } catch (error) {
      console.error('Error cargando anuncios:', error)
      setAnnouncements([])
      setAnnouncementsError('No fue posible cargar los anuncios.')
    } finally {
      setAnnouncementsLoading(false)
    }
  }, [kanbanApi])
  const openAnnouncements = useCallback(() => {
    setAnnouncementsOpen(true)
    loadAnnouncements()
  }, [loadAnnouncements])

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
          <div className={styles.heroActions}>
            <button
              className={styles.announcementsButton}
              onClick={openAnnouncements}
              type="button"
            >
              <i className="bi bi-megaphone" aria-hidden="true" />
              <span>Anuncios</span>
            </button>

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
          </div>
        </header>

        <div className={styles.content}>
          {announcementsError && (
            <div className="alert alert-warning mb-0" role="alert">
              {announcementsError}
            </div>
          )}
          <KanbanFilters
            onApplyFilters={(nextFilters) => setAppliedFilters(nextFilters)}
            onClearFilters={() => setAppliedFilters({})}
          />
          <KanbanColumn filters={appliedFilters} onOperationalLoadChange={handleOperationalLoadChange} />
        </div>
      </section>
      <KanbanAnnouncementsOffCanvas
        announcements={announcements}
        isLoading={announcementsLoading}
        isOpen={announcementsOpen}
        onClose={() => setAnnouncementsOpen(false)}
      />
    </main>
  )
}
