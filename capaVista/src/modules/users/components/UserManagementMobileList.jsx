import UserButton from './UserButton'
import UserStatusBadge from './UserStatusBadge'
import styles from '../pages/UserManagementPage.module.css'

export default function UserManagementMobileList({ isLoading, onEditUser, onUnlinkUser, users }) {
  if (isLoading || users.length === 0) {
    return null
  }

  return (
    <div className={styles.mobileList}>
      {users.map((user) => (
        <article className={styles.mobileUserCard} key={user.id}>
          <header>
            <strong>{user.nombreCompleto}</strong>
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
              <dd>{user.rolUsuario}</dd>
            </div>
          </dl>
          <footer>
            <UserButton onClick={() => onEditUser(user)} variant="secondary">
              Editar
            </UserButton>
            <UserButton
              disabled={user.estadoUsuario === 'Desvinculado'}
              onClick={() => onUnlinkUser(user)}
              variant="danger"
            >
              Desvincular
            </UserButton>
          </footer>
        </article>
      ))}
    </div>
  )
}
