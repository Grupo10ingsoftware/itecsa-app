import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import styles from './LogoutButton.module.css'

export default function LogoutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <button className={`btn btn-sm w-100 ${styles.logoutButton}`} onClick={handleLogout} type="button">
      <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
      Cerrar sesión
    </button>
  )
}