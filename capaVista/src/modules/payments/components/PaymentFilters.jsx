import styles from './PaymentFilters.module.css'

export default function PaymentFilters({
  activeFilter,
  filters,
  getFilterCount,
  onFilterChange,
  onSearchChange,
  searchTerm,
}) {
  return (
    <section
      className={`${styles.toolbar} d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center justify-content-between gap-3`}
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

      <label
        className={`${styles.searchBox} d-flex align-items-center`}
        htmlFor="payment-search"
      >
        <span className="visually-hidden">Buscar pedido o cliente</span>
        <input
          id="payment-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por RUT, NV, empresa o fecha"
          type="search"
          value={searchTerm}
        />
        <i className="bi bi-search" />
      </label>
    </section>
  )
}
