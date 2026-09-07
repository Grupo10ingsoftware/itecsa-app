import styles from './PaymentFilters.module.css'

export default function PaymentFilters({
  activeFilter,
  dateFrom,
  dateTo,
  filters,
  getFilterCount,
  onClearDateRange,
  onDateFromChange,
  onDateToChange,
  onFilterChange,
  onSearchChange,
  searchTerm,
}) {
  const hasDateRange = Boolean(dateFrom || dateTo)

  return (
    <section
      className={styles.toolbar}
      aria-label="Filtros de pago"
    >
      <div className={styles.filterGroup}>
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key

          return (
            <button
              aria-pressed={isActive}
              className={`${styles.filterButton} ${
                isActive ? styles.filterButtonActive : ''
              }`}
              data-filter-key={filter.key}
              key={filter.key}
              onClick={() => onFilterChange(filter.key)}
              type="button"
            >
              <span className={styles.filterLabel}>{filter.label}</span>
              <span className={styles.filterCount}>
                {getFilterCount(filter.key)}
              </span>
            </button>
          )
        })}
      </div>

      <div className={styles.filterControls}>
        <div
          aria-label="Filtrar por fecha de creación"
          className={styles.dateRangeGroup}
          role="group"
        >
          <i
            aria-hidden="true"
            className={`bi bi-calendar3 ${styles.dateRangeIcon}`}
          />

          <label className={styles.dateField} htmlFor="payment-date-from">
            <span>Desde</span>
            <input
              id="payment-date-from"
              max={dateTo || undefined}
              onChange={(event) => onDateFromChange(event.target.value)}
              type="date"
              value={dateFrom}
            />
          </label>

          <label className={styles.dateField} htmlFor="payment-date-to">
            <span>Hasta</span>
            <input
              id="payment-date-to"
              min={dateFrom || undefined}
              onChange={(event) => onDateToChange(event.target.value)}
              type="date"
              value={dateTo}
            />
          </label>

          <button
            aria-hidden={!hasDateRange}
            aria-label="Limpiar rango de fechas"
            className={styles.dateRangeClearButton}
            disabled={!hasDateRange}
            onClick={onClearDateRange}
            tabIndex={hasDateRange ? 0 : -1}
            title="Limpiar fechas"
            type="button"
          >
            <i aria-hidden="true" className="bi bi-x-lg" />
          </button>
        </div>

        <label className={styles.searchBox} htmlFor="payment-search">
          <span className="visually-hidden">
            Buscar por RUT, nota de venta o cliente
          </span>
          <input
            id="payment-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por RUT, NV o cliente"
            type="search"
            value={searchTerm}
          />
          <i aria-hidden="true" className="bi bi-search" />
        </label>
      </div>
    </section>
  )
}
