import styles from '../styles/Kanban.module.css'

function formatAnnouncementDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export default function KanbanAnnouncementsOffCanvas({
  announcements = [],
  isOpen,
  isLoading = false,
  onClose,
}) {
  if (!isOpen) return null

  return (
    <div className={styles.announcementsLayer} role="presentation">
      <aside
        aria-labelledby="kanban-announcements-title"
        aria-modal="true"
        className={styles.announcementsPanel}
        role="dialog"
      >
        <header className={styles.announcementsHeader}>
          <div>
            <span className={styles.offcanvasKicker}>Kanban</span>
            <h2 id="kanban-announcements-title">Anuncios</h2>
          </div>
          <button
            aria-label="Cerrar anuncios"
            className={styles.offcanvasCloseButton}
            onClick={onClose}
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.announcementsBody}>
          {isLoading && (
            <div className={styles.announcementsState}>Cargando anuncios...</div>
          )}

          {!isLoading && announcements.length === 0 && (
            <div className={styles.announcementsState}>No hay anuncios registrados.</div>
          )}

          {!isLoading && announcements.map((announcement) => (
            <article className={styles.announcementCard} key={announcement.id}>
              <div>
                <span>Tiempo</span>
                <strong>{formatAnnouncementDate(announcement.createdAt)}</strong>
              </div>
              <div>
                <span>Responsable</span>
                <strong>{announcement.responsible || 'Usuario'}</strong>
              </div>
              <div>
                <span>Resumen</span>
                <p>{announcement.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </aside>
    </div>
  )
}
