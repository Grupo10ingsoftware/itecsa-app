import { NavLink } from 'react-router-dom'
import { PERMISSIONS } from '../../../config/permissions'
import { useAuth } from '../../../hooks/useAuth'
import styles from './Layout.module.css'

export default function Sidebar() {
  const { hasPermission } = useAuth()

  return (
    <nav className={`nav d-flex flex-column align-items-start p-3 ${styles.sidebar}`}>
      {hasPermission(PERMISSIONS.VIEW_KANBAN_MODULE) && (
        <>
          <NavLink className="nav-link" to="/kanban">
            Principal
          </NavLink>
          <NavLink className="nav-link" to="/kanban">
            Kanban
          </NavLink>
        </>
      )}
      <hr />
      <span className="nav-link">
        <i className="bi bi-person-fill fs-4 text-white m-2" />
        Itecsa
      </span>
    </nav>
  )
}
