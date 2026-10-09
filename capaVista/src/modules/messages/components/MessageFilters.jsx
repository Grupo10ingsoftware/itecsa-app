import styles from './MessageFilters.module.css'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos', icon: 'bi-inbox' },
  { value: 'unread', label: 'No leídos', icon: 'bi-envelope' },
  { value: 'read', label: 'Leídos', icon: 'bi-envelope-open' },
]

const SORT_FILTERS = [
  { value: 'latest', label: 'Últimos', icon: 'bi-sort-down' },
  { value: 'oldest', label: 'Más antiguos', icon: 'bi-sort-up' },
]

export default function MessageFilters({ filters, onChange, onClear }) {
  function update(name, value) {
    onChange({ ...filters, [name]: value })
  }

  return (
    <section aria-label="Filtros de mensajes" className={styles.panel}>
      <div className={styles.quickFilters}>
        <div className={styles.filterGroup}>
          <span className={styles.groupLabel}>Estado</span>
          <div className={styles.chips}>
            {STATUS_FILTERS.map((filter) => (
              <button
                aria-pressed={filters.status === filter.value}
                className={`${styles.chip} ${filters.status === filter.value ? styles.activeChip : ''}`}
                key={filter.value}
                onClick={() => update('status', filter.value)}
                type="button"
              >
                <i className={`bi ${filter.icon}`} aria-hidden="true" />
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.groupLabel}>Orden</span>
          <div className={styles.chips}>
            {SORT_FILTERS.map((filter) => (
              <button
                aria-pressed={filters.sort === filter.value}
                className={`${styles.chip} ${filters.sort === filter.value ? styles.activeChip : ''}`}
                key={filter.value}
                onClick={() => update('sort', filter.value)}
                type="button"
              >
                <i className={`bi ${filter.icon}`} aria-hidden="true" />
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.dateFilters}>
        <label>
          <span>Desde</span>
          <input max={filters.to || undefined} onChange={(event) => update('from', event.target.value)} type="date" value={filters.from} />
        </label>
        <label>
          <span>Hasta</span>
          <input min={filters.from || undefined} onChange={(event) => update('to', event.target.value)} type="date" value={filters.to} />
        </label>
        <button className={styles.clearFilters} onClick={onClear} type="button">
          <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
          Restablecer
        </button>
      </div>
    </section>
  )
}
