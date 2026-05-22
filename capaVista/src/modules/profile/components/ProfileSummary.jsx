import { useAuth } from '../../../hooks/useAuth'
import RoleBadge from '../../../shared/components/data/RoleBadge'

export default function ProfileSummary() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="small text-white-50" aria-live="polite">
        Sin usuario activo
      </div>
    )
  }

  // Perfil desde sesion simulada de frontend; backend/Auth0 o /users/me lo reemplazara.
  const firstName = user.primerNombre ?? user.firstName ?? 'Usuario'
  const lastName = user.apellidoPaterno ?? user.lastName ?? ''
  const email = user.correoUsuario ?? user.email ?? 'Correo no disponible'
  const role = user.rolUsuario ?? user.role

  return (
    <section aria-label="Perfil de usuario autenticado" className="w-100">
      <div className="d-flex align-items-center gap-2 mb-2">
        <i className="bi bi-person-circle fs-4 text-white" aria-hidden="true" />
        <div className="min-w-0">
          <p className="fw-semibold text-white mb-0">
            {firstName} {lastName}
          </p>
          <p className="small text-white-50 text-break mb-0">{email}</p>
        </div>
      </div>
      <RoleBadge role={role} />
    </section>
  )
}
