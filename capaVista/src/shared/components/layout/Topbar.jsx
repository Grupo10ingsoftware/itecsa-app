import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { HEADER_NAVIGATION_ROUTES } from '../../../config/routes'
import { PERMISSIONS } from '../../../config/permissions'
import { useAuth } from '../../../hooks/useAuth'
import { preloadInformationPage } from '../../../app/informationPageLoaders'
import ProfileSummary from '../../../modules/profile/components/ProfileSummary'
import NotificationBell from '../../../modules/messages/components/NotificationBell'
import styles from './Layout.module.css'

export default function Topbar({ onOpenMobileSidebar }) {
  const { hasPermission } = useAuth()
  const [popupContainer, setPopupContainer] = useState(null)
  return (
    <header className={styles.topbar}>
      <button
        aria-label="Abrir menú lateral"
        className={styles.mobileMenuButton}
        onClick={onOpenMobileSidebar}
        type="button"
      >
        <i className="bi bi-list" aria-hidden="true" />
      </button>

      <div className={styles.topbarIdentity} ref={setPopupContainer}>
        <ProfileSummary />
      </div>
      <nav className={styles.topbarActions} aria-label="Acciones del usuario">
        {hasPermission(PERMISSIONS.READ_MESSAGES) && <NotificationBell popupContainer={popupContainer} buttonClassName={styles.headerAction} />}
        {HEADER_NAVIGATION_ROUTES.filter(route => hasPermission(route.permission)).map(route => (
          <NavLink key={route.path} to={route.path} aria-label={route.label} title={route.label}
            className={styles.headerAction} onPointerEnter={() => preloadInformationPage(route.path)}
            onFocus={() => preloadInformationPage(route.path)} onPointerDown={() => preloadInformationPage(route.path)}>
            <i className={`bi ${route.icon}`} aria-hidden="true" />
            {!route.iconOnly && <span className={styles.headerActionText}>{route.label}</span>}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
