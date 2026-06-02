import LogoutButton from '../../../modules/auth/components/LogoutButton'
import NavigationMenu from '../navigation/NavigationMenu'
import styles from './Layout.module.css'

export default function Sidebar({ isCollapsed = false, onCloseMobile, onToggleCollapse }) {
  return (
    <nav className={styles.sidebarNav} aria-label="Menú principal">
      <div className={styles.sidebarHeader}>
        <button
          aria-label={isCollapsed ? 'Abrir barra lateral' : 'Cerrar barra lateral'}
          className={`${styles.sidebarIconButton} ${styles.desktopToggleButton}`}
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Abrir barra lateral' : 'Cerrar barra lateral'}
          type="button"
        >
          <i className={`bi ${isCollapsed ? 'bi-layout-sidebar-inset' : 'bi-layout-sidebar'}`} aria-hidden="true" />
        </button>

        <button
          aria-label="Cerrar menú"
          className={`${styles.sidebarIconButton} ${styles.mobileCloseButton}`}
          onClick={onCloseMobile}
          type="button"
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>

      <div className={styles.sidebarBody}>
        <NavigationMenu onNavigate={onCloseMobile} />
      </div>

      <div className={styles.sidebarFooter}>
        <LogoutButton />
      </div>
    </nav>
  )
}
