import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

export default function LogoutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    // Logout visual/simulado: limpia solo estado React en memoria; backend/Auth0 lo reemplazara.
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <button className="btn btn-outline-light btn-sm w-100" onClick={handleLogout} type="button">
      <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
      Cerrar sesión
    </button>
  )
}
