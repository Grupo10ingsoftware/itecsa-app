import { useAuth } from '../../../hooks/useAuth'
import styles from './LogoutButton.module.css'

export default function LogoutButton() {
  const { logout } = useAuth()

  function handleLogout() {
    logout()
  }

  return (
    <button className={`btn btn-sm w-100 ${styles.logoutButton}`} onClick={handleLogout} type="button">
      <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
      Cerrar sesión
    </button>
  )
}
