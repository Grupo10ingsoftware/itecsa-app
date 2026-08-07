import { useMemo } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import RoleBadge from '../../../shared/components/data/RoleBadge'
import styles from './ProfilePage.module.css'

const MOCK_MOVEMENTS = Object.freeze([
  {
    id: 'profile-movement-1',
    action: 'Completo el subproceso Impresion del pedido Pedido6.',
    dateTime: '2026-08-05 11:45',
  },
  {
    id: 'profile-movement-2',
    action: 'Registro una observacion operativa en el pedido Pedido6.',
    dateTime: '2026-08-05 11:48',
  },
  {
    id: 'profile-movement-3',
    action: 'Valido una desvinculacion desde Gestion de usuarios.',
    dateTime: '2026-08-05 12:10',
  },
])

function getDisplayValue(value, fallback = 'Pendiente de backend') {
  return String(value ?? '').trim() || fallback
}

function getInitials(firstName, lastName, email) {
  const firstInitial = String(firstName ?? '').trim().charAt(0)
  const lastInitial = String(lastName ?? '').trim().charAt(0)
  const emailInitial = String(email ?? '').trim().charAt(0)

  return `${firstInitial}${lastInitial}`.trim().toUpperCase() || emailInitial.toUpperCase() || 'U'
}

export default function ProfilePage() {
  const { auth0User, user } = useAuth()
  const profile = useMemo(() => {
    const firstName = user?.nombreUsuario ?? user?.primerNombre ?? auth0User?.given_name ?? auth0User?.name
    const lastName = user?.apellidoUsuario ?? user?.apellidoPaterno ?? auth0User?.family_name ?? ''
    const email = user?.correoUsuario ?? user?.email ?? auth0User?.email
    const role = user?.rolUsuario ?? user?.role
    const status = user?.estadoUsuario ?? 'Vinculado'

    return {
      firstName,
      lastName,
      email,
      role,
      status,
      rut: user?.rutUsuario,
      picture: auth0User?.picture,
      initials: getInitials(firstName, lastName, email),
    }
  }, [auth0User, user])

  return (
    <main className={`container-fluid ${styles.page}`} aria-labelledby="profile-title">
      <section className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.sectionLabel}>Usuario</span>
          <h1 className={styles.pageTitle} id="profile-title">
            Mi perfil
          </h1>
        </header>

        <section className={styles.profileGrid} aria-label="Datos del usuario">
          <aside className={styles.photoPanel}>
            {profile.picture ? (
              <img alt="" className={styles.profilePhoto} src={profile.picture} />
            ) : (
              <div className={styles.profilePhotoFallback} aria-hidden="true">
                {profile.initials}
              </div>
            )}
          </aside>

          <div className={styles.infoPanel}>
            <div className={styles.infoHeader}>
              <div>
                <span className={styles.sectionLabel}>Informacion ingresada</span>
                <h2>{getDisplayValue(`${getDisplayValue(profile.firstName, '')} ${getDisplayValue(profile.lastName, '')}`.trim(), 'Usuario sin nombre')}</h2>
              </div>
              <span className={styles.statusBadge}>{getDisplayValue(profile.status, 'Vinculado')}</span>
            </div>

            <dl className={styles.infoList}>
              <div>
                <dt>Nombres</dt>
                <dd>{getDisplayValue(profile.firstName)}</dd>
              </div>
              <div>
                <dt>Apellidos</dt>
                <dd>{getDisplayValue(profile.lastName)}</dd>
              </div>
              <div>
                <dt>Rut</dt>
                <dd>{getDisplayValue(profile.rut)}</dd>
              </div>
              <div>
                <dt>Correo electronico</dt>
                <dd>{getDisplayValue(profile.email)}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>
                  <RoleBadge role={profile.role} />
                </dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{getDisplayValue(profile.status, 'Vinculado')}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={styles.movementsPanel} aria-labelledby="movements-title">
          <header className={styles.movementsHeader}>
            <span className={styles.sectionLabel}>Actividad</span>
            <h2 id="movements-title">Ultimo movimiento</h2>
          </header>

          <div className={styles.movementsTable} role="table" aria-label="Ultimos movimientos del usuario">
            <div className={styles.movementsHead} role="row">
              <span role="columnheader">Movimiento</span>
              <span role="columnheader">Fecha y hora</span>
            </div>
            {MOCK_MOVEMENTS.map((movement) => (
              <div className={styles.movementRow} key={movement.id} role="row">
                <span role="cell">{movement.action}</span>
                <time dateTime={movement.dateTime} role="cell">
                  {movement.dateTime}
                </time>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
