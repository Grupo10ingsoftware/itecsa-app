import LogoutButton from '../../../modules/auth/components/LogoutButton'
import NavigationMenu from '../navigation/NavigationMenu'
import { NavLink } from 'react-router-dom'
import { APP_ROUTES } from '../../../config/routes'
import styles from './Layout.module.css'
import { useEffect } from 'react'
import { preloadInformationPage, preloadInformationPages } from '../../../app/informationPageLoaders'

export default function Sidebar({ isCollapsed = false, onCloseMobile, onToggleCollapse }) {
  useEffect(() => {
    // Warm these small, frequently used modules after the shell can render.
    // Importing code does not mount a page or fetch its authenticated data.
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(preloadInformationPages)
      return () => window.cancelIdleCallback(handle)
    }
    const handle = window.setTimeout(preloadInformationPages, 0)
    return () => window.clearTimeout(handle)
  }, [])
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
        <div className={styles.sidebarActions}>
          {[
            { path: APP_ROUTES.DOCUMENTS, label: 'Documentos', icon: 'bi-file-earmark-text' },
            { path: APP_ROUTES.DATA_REQUESTS, label: 'Solicitudes', icon: 'bi-envelope-check' },
          ].map(action => (
            <NavLink className={styles.sidebarAction} to={action.path} key={action.path} aria-label={action.label} title={action.label} onClick={onCloseMobile} onPointerEnter={() => preloadInformationPage(action.path)} onFocus={() => preloadInformationPage(action.path)} onPointerDown={() => preloadInformationPage(action.path)}>
              <i className={`bi ${action.icon}`} aria-hidden="true" />
              <span className={styles.navText}>{action.label}</span>
            </NavLink>
          ))}
        </div>
        <NavLink className={`${styles.sidebarAction} ${styles.incidentAction}`} to={APP_ROUTES.INCIDENT_REPORT} aria-label="Reportar incidente" title="Reportar incidente" onClick={onCloseMobile} onPointerEnter={() => preloadInformationPage(APP_ROUTES.INCIDENT_REPORT)} onFocus={() => preloadInformationPage(APP_ROUTES.INCIDENT_REPORT)} onPointerDown={() => preloadInformationPage(APP_ROUTES.INCIDENT_REPORT)}>
          <i className="bi bi-shield-fill" aria-hidden="true" />
          <span className={styles.navText}>Reportar incidente</span>
        </NavLink>
        <LogoutButton />
      </div>
    </nav>
  )
}
