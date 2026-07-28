import styles from './ProductionHistoryFilters.module.css'

export default function ProductionHistoryFilters({
  currentPage,
  onPageChange,
  onSearchChange,
  pageCount,
  searchTerm,
  total,
}) {
  return (
    <section className={styles.toolbar} aria-label="Filtros de historial de produccion">
      <label className={styles.searchBox} htmlFor="production-history-search">
        <span className="visually-hidden">Buscar pedido</span>
        <input
          id="production-history-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por pedido, cliente, vendedor o producto"
          type="search"
          value={searchTerm}
        />
        <i className="bi bi-search" aria-hidden="true" />
      </label>

      <div className={styles.paginationGroup} aria-label="Paginacion de pedidos">
        <span className={styles.resultCount}>{total} pedidos</span>
        <button
          className={styles.pageButton}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Pagina anterior"
          type="button"
        >
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
        <span className={styles.pageIndicator}>
          {currentPage} / {pageCount}
        </span>
        <button
          className={styles.pageButton}
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          title="Pagina siguiente"
          type="button"
        >
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
