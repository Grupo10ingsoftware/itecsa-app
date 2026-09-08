import { getRoleLabel } from '../../../config/roles'
import UserButton from './UserButton'
import UserStatusBadge from './UserStatusBadge'
import styles from '../pages/UserManagementPage.module.css'

export default function UserManagementMobileList({ isLoading, onEditUser, users }) {
  if (isLoading) {
    return (
      <div className={styles.mobileList}>
        <p className={styles.mobileState} role="status">Cargando usuarios...</p>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className={styles.mobileList}>
        <p className={styles.mobileState}>No se encontraron usuarios para los filtros seleccionados.</p>
      </div>
    )
  }

  return (
    <div className={styles.mobileList}>
      {users.map((user) => (
        <article className={styles.mobileUserCard} key={user.id}>
          <header>
            <strong>{user.nombreListado}</strong>
            <UserStatusBadge status={user.estadoUsuario} />
          </header>
          <dl>
            <div>
              <dt>RUT</dt>
              <dd>{user.rutUsuario}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{user.correoUsuario}</dd>
            </div>
            <div>
              <dt>Rol</dt>
              <dd>{getRoleLabel(user.rolUsuario)}</dd>
            </div>
          </dl>
          <footer>
            <UserButton icon="bi-pencil-fill" onClick={() => onEditUser(user)} variant="secondary">
              Editar
            </UserButton>
          </footer>
        </article>
      ))}
    </div>
  )
}
