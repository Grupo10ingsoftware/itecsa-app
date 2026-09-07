import styles from './PaymentFilters.module.css'

function openNativeDatePicker(input) {
  if (!input) return

  input.focus({ preventScroll: true })

  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker()
    } catch {
      // El navegador conserva el comportamiento nativo del input como respaldo.
    }
  }
}

function handleDateFieldClick(event) {
  const input = event.currentTarget.querySelector('input[type="date"]')

  if (event.target === input || typeof input?.showPicker !== 'function') return

  event.preventDefault()
  openNativeDatePicker(input)
}

function handleDateInputClick(event) {
  openNativeDatePicker(event.currentTarget)
}

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
          className={`${styles.dateRangeGroup} ${
            hasDateRange ? styles.dateRangeGroupActive : ''
          }`}
          role="group"
        >
          <label
            className={styles.dateField}
            htmlFor="payment-date-from"
            onClick={handleDateFieldClick}
          >
            <span>Desde</span>
            <input
              id="payment-date-from"
              max={dateTo || undefined}
              onChange={(event) => onDateFromChange(event.target.value)}
              onClick={handleDateInputClick}
              type="date"
              value={dateFrom}
            />
          </label>

          <label
            className={styles.dateField}
            htmlFor="payment-date-to"
            onClick={handleDateFieldClick}
          >
            <span>Hasta</span>
            <input
              id="payment-date-to"
              min={dateFrom || undefined}
              onChange={(event) => onDateToChange(event.target.value)}
              onClick={handleDateInputClick}
              type="date"
              value={dateTo}
            />
          </label>

          {hasDateRange && (
            <button
              aria-label="Limpiar rango de fechas"
              className={styles.dateRangeClearButton}
              onClick={onClearDateRange}
              title="Limpiar fechas"
              type="button"
            >
              <i aria-hidden="true" className="bi bi-x-lg" />
            </button>
          )}
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
