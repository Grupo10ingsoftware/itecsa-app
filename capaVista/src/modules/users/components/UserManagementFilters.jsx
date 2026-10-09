import { useAuth } from "../../../hooks/useAuth";
import { getRoleLabel, manageableRoles } from '../../../config/roles'
import UserButton from './UserButton'
import styles from '../pages/UserManagementPage.module.css'

const STATUS_FILTERS = Object.freeze([
  { value: '', label: 'Todos', countKey: 'totalUsuarios' },
  { value: 'Vinculado', label: 'Vinculados', countKey: 'vinculados' },
  { value: 'Pendiente', label: 'Pendientes', countKey: 'pendientes' },
  { value: 'Pendiente rol', label: 'Pendientes de rol', countKey: 'pendientesRol' },
  { value: 'Desvinculado', label: 'Desvinculados', countKey: 'desvinculados' },
])

export default function UserManagementFilters({
  activeRole,
  activeStatus,
  isOpen,
  onClear,
  onCreateUser,
  onRoleChange,
  onSearchChange,
  onStatusChange,
  onToggle,
  searchTerm,
  summary,
}) {
  const hasActiveFilters = Boolean(activeRole || activeStatus || searchTerm.trim())

  const { user: actor } = useAuth()
  return (
    <section className={styles.filtersShell} aria-label="Busqueda y filtros de usuarios">
      <div className={styles.filtersTopbar}>
        <label className={styles.searchBox} htmlFor="user-management-search">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="visually-hidden">Buscar usuario</span>
          <input
            id="user-management-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre, apellido, correo o RUT"
            type="search"
            value={searchTerm}
          />
        </label>

        <button
          aria-controls="user-management-filter-panel"
          aria-expanded={isOpen}
          className={styles.filterToggleButton}
          onClick={onToggle}
          type="button"
        >
          <i className="bi bi-funnel" aria-hidden="true" />
          {isOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>

        <UserButton className={styles.createUserButton} icon="bi-plus-lg" onClick={onCreateUser} variant="primary">
          Crear usuario
        </UserButton>
      </div>

      {isOpen && (
        <div className={styles.filterPanel} id="user-management-filter-panel">
          <fieldset className={styles.filterGroup}>
            <legend>Estado</legend>
            <div className={styles.filterOptions}>
              {STATUS_FILTERS.map((filter) => (
                <button
                  aria-pressed={activeStatus === filter.value}
                  className={`${styles.filterChip} ${activeStatus === filter.value ? styles.filterChipActive : ''}`}
                  key={filter.label}
                  onClick={() => onStatusChange(filter.value)}
                  type="button"
                >
                  <span>{filter.label}</span>
                  <strong>{summary?.[filter.countKey] ?? '—'}</strong>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.filterGroup}>
            <legend>Rol</legend>
            <div className={styles.filterOptions}>
              <button
                aria-pressed={activeRole === ''}
                className={`${styles.filterChip} ${activeRole === '' ? styles.filterChipActive : ''}`}
                onClick={() => onRoleChange('')}
                type="button"
              >
                <span>Todos</span>
              </button>
              {manageableRoles(actor?.rolUsuario).map((role) => (
                <button
                  aria-pressed={activeRole === role}
                  className={`${styles.filterChip} ${activeRole === role ? styles.filterChipActive : ''}`}
                  key={role}
                  onClick={() => onRoleChange(role)}
                  type="button"
                >
                  <span>{getRoleLabel(role)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <button className={styles.clearFiltersButton} disabled={!hasActiveFilters} onClick={onClear} type="button">
            <i className="bi bi-trash3" aria-hidden="true" />
            Limpiar filtros
          </button>
        </div>
      )}
    </section>
  )
}
