import { useAuth } from '../../../hooks/useAuth'
import RoleBadge from '../../../shared/components/data/RoleBadge'
import styles from './ProfileSummary.module.css'

export default function ProfileSummary() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="small text-white-50" aria-live="polite">
        Sin usuario activo
      </div>
    )
  }

  // Datos internos entregados por la sesión verificada.
  const firstName = user.primerNombre ?? user.firstName ?? 'Usuario'
  const lastName = user.apellidoPaterno ?? user.lastName ?? ''
  const email = user.correoUsuario ?? user.email ?? 'Correo no disponible'
  const role = user.rolUsuario ?? user.role

  return (
    <section aria-label="Perfil de usuario autenticado" className={styles.summary}>
        <i className={`bi bi-person-circle ${styles.avatar}`} aria-hidden="true" />
        <div className={styles.copy}>
          <p className={styles.name} title={`${firstName} ${lastName}`.trim()}>
            {firstName} {lastName}
          </p>
          <p className={styles.email} title={email}>{email}</p>
          <div className={styles.role}><RoleBadge role={role} /></div>
        </div>
    </section>
  )
}
