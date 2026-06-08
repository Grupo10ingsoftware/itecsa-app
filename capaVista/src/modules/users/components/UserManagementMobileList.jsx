import UserButton from './UserButton'
import UserStatusBadge from './UserStatusBadge'
import styles from '../pages/UserManagementPage.module.css'

export default function UserManagementMobileList({ isLoading, onEditUser, users }) {
  if (isLoading) {
    return <div className={styles.mobileState}>Cargando usuarios desde Auth0...</div>
  }

  if (users.length === 0) {
    return <div className={styles.mobileState}>No se encontraron usuarios para los filtros seleccionados.</div>
  }

  return (
    <section className={styles.mobileUserList} aria-label="Usuarios">
      {users.map((user) => (
        <article
          className={`${styles.mobileUserCard} ${
            user.estado === 'Desvinculado' ? styles.mobileUserCardUnlinked : styles.mobileUserCardLinked
          }`}
          key={`mobile-${user.id}`}
        >
          <header className={styles.mobileUserHeader}>
            <div>
              <span>Usuario</span>
              <strong>{user.nombreCompleto}</strong>
              <small>{user.correo}</small>
            </div>
            <UserStatusBadge status={user.estado} />
          </header>

          <dl className={styles.mobileUserDetails}>
            <div>
              <dt>RUT</dt>
              <dd>{user.rut}</dd>
            </div>
            <div>
              <dt>Rol</dt>
              <dd>{user.rol}</dd>
            </div>
            <div>
              <dt>Último acceso</dt>
              <dd>{user.ultimoAcceso}</dd>
            </div>
          </dl>

          <UserButton className={styles.mobileEditButton} onClick={() => onEditUser(user)} variant="secondary">
            Editar usuario
          </UserButton>
        </article>
      ))}
    </section>
  )
}
