import { useState } from 'react'
import styles from '../styles/Kanban.module.css'

export default function KanbanFilters() {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <section className={styles.filtersShell}>
      <div className={styles.filtersTopbar}>
        <div>
          <span className={styles.filtersEyebrow}>Búsqueda de órdenes</span>
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
              <span>Número de nota de venta</span>
              <input className="form-control" placeholder="Ej. NV-6767" type="text" />
            </label>

            <label>
              <span>Número de orden de producción</span>
              <input className="form-control" placeholder="Ej. OP-2026-001" type="text" />
            </label>

            <label>
              <span>Nombre del cliente</span>
              <input className="form-control" placeholder="Ej. Colegio Andes" type="text" />
            </label>

            <label>
              <span>Vendedor</span>
              <select className="form-select" defaultValue="">
                <option value="">Seleccionar vendedor</option>
                <option value="ventas-1">Ventas 1</option>
                <option value="ventas-2">Ventas 2</option>
              </select>
            </label>
          </div>

          <div className={styles.filterActions}>
            <button className={styles.applyFilterButton} type="button">
              Aplicar filtros
            </button>
            <button className={styles.resetFilterButton} type="button">
              Limpiar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
