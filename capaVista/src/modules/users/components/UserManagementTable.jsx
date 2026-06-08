import UserButton from './UserButton'
import UserManagementMobileList from './UserManagementMobileList'
import UserStatusBadge from './UserStatusBadge'
import styles from '../pages/UserManagementPage.module.css'

const TABLE_COLUMNS = Object.freeze([
  'Nombre completo',
  'RUT',
  'Correo',
  'Rol',
  'Estado',
  'Último acceso',
  'Acciones',
])

function buildNearbyPages(currentPage, totalPages) {
  if (totalPages <= 4) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 2) {
    return [1, 2, 3, 'ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 1) {
    return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages]
  }

  return [currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages]
}

export default function UserManagementTable({ currentPage, isLoading, onEditUser, onPageChange, totalPages, users }) {
  const pageItems = buildNearbyPages(currentPage, totalPages)
  const canGoPrevious = currentPage > 1 && !isLoading
  const canGoNext = currentPage < totalPages && !isLoading

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableResponsive}>
        <table className={styles.usersTable}>
          <colgroup>
            <col className={styles.nameColumn} />
            <col className={styles.rutColumn} />
            <col className={styles.emailColumn} />
            <col className={styles.roleColumn} />
            <col className={styles.statusColumn} />
            <col className={styles.accessColumn} />
            <col className={styles.actionsColumn} />
          </colgroup>
          <thead>
            <tr>
              {TABLE_COLUMNS.map((column) => (
                <th className={column === 'Acciones' ? styles.actionsCell : undefined} key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={styles.tableStateCell} colSpan={TABLE_COLUMNS.length}>
                  Cargando usuarios desde Auth0...
                </td>
              </tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr>
                <td className={styles.tableStateCell} colSpan={TABLE_COLUMNS.length}>
                  No se encontraron usuarios para los filtros seleccionados.
                </td>
              </tr>
            )}
            {!isLoading &&
              users.map((user) => (
                <tr key={user.id}>
                  <td className={styles.nameCell}>{user.nombreCompleto}</td>
                  <td className={styles.rutCell}>{user.rut}</td>
                  <td className={styles.emailCell}>{user.correo}</td>
                  <td>{user.rol}</td>
                  <td>
                    <UserStatusBadge status={user.estado} />
                  </td>
                  <td className={styles.accessCell}>{user.ultimoAcceso}</td>
                  <td className={styles.actionsCell}>
                    <UserButton className={styles.editButton} onClick={() => onEditUser(user)} variant="secondary">
                      Editar
                    </UserButton>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <UserManagementMobileList isLoading={isLoading} onEditUser={onEditUser} users={users} />

      <footer className={styles.paginationFooter} aria-label="Paginación de usuarios">
        <UserButton
          className={styles.paginationSideButton}
          disabled={!canGoPrevious}
          onClick={() => onPageChange(currentPage - 1)}
          variant="secondary"
        >
          <i className="bi bi-arrow-left" aria-hidden="true" />
          <span className={styles.paginationButtonLabel}>Anterior</span>
        </UserButton>

        <div className={styles.paginationCenter}>
          <span className={styles.pageSummary}>
            Página {currentPage} de {totalPages}
          </span>
          <nav className={styles.pageButtons} aria-label="Páginas cercanas">
            {pageItems.map((pageItem, index) =>
              pageItem === 'ellipsis' ? (
                <span className={styles.pageEllipsis} key={`ellipsis-${index}`}>
                  ...
                </span>
              ) : (
                <button
                  aria-current={pageItem === currentPage ? 'page' : undefined}
                  className={`${styles.pageButton} ${pageItem === currentPage ? styles.pageButtonActive : ''}`}
                  disabled={isLoading}
                  key={pageItem}
                  onClick={() => onPageChange(pageItem)}
                  type="button"
                >
                  {pageItem}
                </button>
              ),
            )}
          </nav>
        </div>

        <UserButton
          className={styles.paginationSideButton}
          disabled={!canGoNext}
          onClick={() => onPageChange(currentPage + 1)}
          variant="secondary"
        >
          <span className={styles.paginationButtonLabel}>Siguiente</span>
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </UserButton>
      </footer>
    </div>
  )
}
