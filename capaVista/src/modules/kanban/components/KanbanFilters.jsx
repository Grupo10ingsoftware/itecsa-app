import { useState } from 'react'
import styles from '../styles/Kanban.module.css'

const EMPTY_FILTERS = Object.freeze({
  clientName: '',
  salesNoteNumber: '',
  productType: '',
})

export default function KanbanFilters({ onApplyFilters, onClearFilters }) {
  const [showFilters, setShowFilters] = useState(false)
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)

  function updateFilter(field, value) {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }))
  }

  function applyFilters() {
    onApplyFilters?.(draftFilters)
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS)
    onClearFilters?.()
  }

  return (
    <section className={styles.filtersShell}>
      <div className={styles.filtersTopbar}>
        <div>
          <span className={styles.filtersEyebrow}>Busqueda de ordenes</span>
          <h2>Filtros del tablero</h2>
        </div>

        <button
          className={styles.filterToggleButton}
          onClick={() => setShowFilters((currentValue) => !currentValue)}
          type="button"
        >
          <i className="bi bi-funnel" aria-hidden="true" />
          {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
      </div>

      {showFilters && (
        <div className={styles.filterCard}>
          <div className={styles.filterGrid}>
            <label>
              <span>Numero de pedido</span>
              <input
                className="form-control"
                onChange={(event) => updateFilter('salesNoteNumber', event.target.value)}
                placeholder="Ej. 24038"
                type="text"
                value={draftFilters.salesNoteNumber}
              />
            </label>

            <label>
              <span>Nombre del cliente</span>
              <input
                className="form-control"
                onChange={(event) => updateFilter('clientName', event.target.value)}
                placeholder="Ej. Colegio Andes"
                type="text"
                value={draftFilters.clientName}
              />
            </label>

            <label>
              <span>Tipo de producto</span>
              <select
                className="form-select"
                onChange={(event) => updateFilter('productType', event.target.value)}
                value={draftFilters.productType}
              >
                <option value="">Todos</option>
                <option value="lanyard">Lanyard</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="yoyo">Yoyo</option>
                <option value="mixto">Mixto</option>
              </select>
            </label>
          </div>

          <div className={styles.filterActions}>
            <button className={styles.applyFilterButton} onClick={applyFilters} type="button">
              Aplicar filtros
            </button>
            <button className={styles.resetFilterButton} onClick={clearFilters} type="button">
              Limpiar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
