import KanbanColumn from '../components/KanbanColumn'
import KanbanFilters from '../components/KanbanFilters'
import styles from './KanbanBoardPage.module.css'

export default function KanbanBoardPage() {
  return (
    <main className={`container-fluid ${styles.page}`}>
      <section className={styles.dashboardShell}>
        <header className={styles.hero}>
          <div>
            <span className={styles.sectionLabel}>Producción</span>
            <h1 className={styles.pageTitle}>Kanban</h1>
            <p className={styles.pageSubtitle}>
              Vista principal de seguimiento de producción con arrastre de órdenes entre estados.
            </p>
          </div>
        </header>

        <div className={styles.content}>
          <KanbanFilters />
          <KanbanColumn />
        </div>
      </section>
    </main>
  )
}
