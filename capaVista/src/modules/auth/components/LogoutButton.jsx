import { useAuth } from '../../../hooks/useAuth'
import styles from './LogoutButton.module.css'

export default function LogoutButton() {
  const { logout } = useAuth()

  function handleLogout() {
    logout()
  }

  return (
    <button
      aria-label="Cerrar sesión"
      className={`btn btn-sm w-100 ${styles.logoutButton}`}
      onClick={handleLogout}
      type="button"
    >
      Cerrar sesión
    </button>
  )
}
