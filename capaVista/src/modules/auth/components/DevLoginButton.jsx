import { useLocation, useNavigate } from 'react-router-dom'
import { ROLES } from '../../../config/roles'
import { useAuth } from '../../../hooks/useAuth'

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

    const redirectPath = location.state?.from?.pathname || '/kanban'
    navigate(redirectPath, { replace: true })
  }

  return (
    <aside aria-label="Acceso temporal de desarrollo">
      <p className="small text-secondary mb-2">
        Acceso temporal de desarrollo. Se removera cuando comience el login real con backend.
      </p>
      <button className="btn btn-warning btn-sm w-100" disabled={!adminUser} onClick={handleDevLogin} type="button">
        Entrar como admin simulado
      </button>
    </aside>
  )
}
