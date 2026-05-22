import { NavLink } from 'react-router-dom'
import { PERMISSIONS } from '../../../config/permissions'
import { useAuth } from '../../../hooks/useAuth'
import LogoutButton from '../../../modules/auth/components/LogoutButton'
import ProfileSummary from '../../../modules/profile/components/ProfileSummary'
import styles from './Layout.module.css'

export default function Sidebar() {
  const { hasPermission } = useAuth()

  return (
    <nav className={`nav d-flex flex-column align-items-start p-3 ${styles.sidebarNav}`}>
      <div className="w-100">
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
        {hasPermission(PERMISSIONS.CREATE_USERS_VISUALLY) && (
          <NavLink className="nav-link" to="/admin/usuarios/nuevo">
            Crear usuario
          </NavLink>
        )}
      </div>

      <div className={`w-100 mt-auto ${styles.sidebarUserBlock}`}>
        <ProfileSummary />
        <hr />
        <LogoutButton />
      </div>
    </nav>
  )
}
