import { useLocation, useNavigate } from 'react-router-dom'
import { ROLES } from '../../../config/roles'
import { useAuth } from '../../../hooks/useAuth'

function getSafeRedirectPath(state, search) {
  const searchParams = new URLSearchParams(search)
  const candidatePath = state?.fromPath ?? searchParams.get('from') ?? state?.from?.pathname

  if (
    typeof candidatePath === 'string' &&
    candidatePath.startsWith('/') &&
    !candidatePath.startsWith('//')
  ) {
    return candidatePath
  }

  return '/kanban'
}

export default function DevLoginButton() {
  const { loginAsMockUser, mockUsers } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const adminUser = mockUsers.find((candidate) => {
    return (candidate.rolUsuario ?? candidate.role) === ROLES.ADMINISTRADOR
  })

  function handleDevLogin() {
    if (!adminUser) {
      return
    }

    // Acceso temporal solo para desarrollo/frontend simulado; eliminar cuando exista login real con backend.
    loginAsMockUser(adminUser.idUsuario ?? adminUser.id)

    const redirectPath = getSafeRedirectPath(location.state, location.search)
    navigate(redirectPath, { replace: true })
  }

  return (
    <aside aria-label="Acceso rápido">
      <p className="small text-secondary mb-2">
        Acceso rápido de administrador.
      </p>
      <button className="btn btn-warning btn-sm w-100" disabled={!adminUser} onClick={handleDevLogin} type="button">
        Entrar como administrador
      </button>
    </aside>
  )
}
