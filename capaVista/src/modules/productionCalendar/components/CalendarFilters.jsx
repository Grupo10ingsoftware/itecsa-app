import { PRODUCTION_STATUSES } from '../config/productionCalendar.config'
import styles from './CalendarFilters.module.css'

export default function CalendarFilters({ filters, onChange, onClear }) {
  return (
    <section className={styles.filtersCard} aria-label="Filtros de calendario">
      <label>
        <span>Buscar</span>
        <input
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="NV, cliente o producto"
          type="search"
          value={filters.search}
        />
      </label>
      <label>
        <span>Estado</span>
        <select onChange={(event) => onChange({ status: event.target.value })} value={filters.status}>
          <option value="">Todos</option>
          {Object.values(PRODUCTION_STATUSES).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Producto</span>
        <select onChange={(event) => onChange({ productType: event.target.value })} value={filters.productType}>
          <option value="">Todos</option>
          <option value="Lanyard">Lanyard</option>
          <option value="Tarjeta">Tarjeta</option>
          <option value="Yoyo">Yoyo</option>
        </select>
      </label>
      <button className={styles.clearButton} onClick={onClear} type="button">
        Limpiar filtros
      </button>
    </section>
  )
}
