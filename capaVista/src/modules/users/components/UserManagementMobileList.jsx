import { getRoleLabel } from '../../../config/roles'
import UserButton from './UserButton'
import UserStatusBadge from './UserStatusBadge'
import styles from '../pages/UserManagementPage.module.css'

const SELF_UNLINK_MESSAGE = 'No puedes desvincular tu propia cuenta.'

export default function UserManagementMobileList({ isLoading, onEditUser, onUnlinkUser, users }) {
  if (isLoading || users.length === 0) {
    return null
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
            <UserButton onClick={() => onEditUser(user)} variant="secondary">
              Editar
            </UserButton>
            {user.isCurrentUser ? (
              <span
                aria-label={SELF_UNLINK_MESSAGE}
                className={styles.selfUnlinkControl}
                data-tooltip={SELF_UNLINK_MESSAGE}
                tabIndex={0}
                title={SELF_UNLINK_MESSAGE}
              >
                <UserButton className={styles.selfUnlinkButton} disabled variant="danger">
                  Desvincular
                </UserButton>
              </span>
            ) : (
              <UserButton
                disabled={user.estadoUsuario === 'Desvinculado'}
                onClick={() => onUnlinkUser(user)}
                variant="danger"
              >
                Desvincular
              </UserButton>
            )}
          </footer>
        </article>
      ))}
    </div>
  )
}
