import { NavLink } from 'react-router-dom'
import { APP_ROUTES, MAIN_NAVIGATION_ROUTES } from '../../../config/routes'
import { useAuth } from '../../../hooks/useAuth'
import styles from '../layout/Layout.module.css'

const ROUTE_ICONS_BY_PATH = Object.freeze({
  [APP_ROUTES.KANBAN]: 'bi-kanban',
  [APP_ROUTES.PAYMENTS]: 'bi-cash-coin',
  [APP_ROUTES.ADMIN_USERS]: 'bi-people',
  [APP_ROUTES.ADMIN_USERS_CREATE]: 'bi-person-plus',
  [APP_ROUTES.ORDERS_CREATE]: 'bi-receipt',
  [APP_ROUTES.PRODUCTION_HISTORY]: 'bi-clock-history',
  [APP_ROUTES.PRODUCTION_CALENDAR]: 'bi-calendar3',
})

export default function NavigationMenu({ onNavigate }) {
  const { hasPermission, hasRole } = useAuth()

  function canNavigate(route) {
    const matchesPermission = !route.permission || hasPermission(route.permission)
    const requiredRoles = route.requiredRoles ?? []
    const matchesRole = requiredRoles.length === 0 || requiredRoles.some((role) => hasRole(role))

    return matchesPermission && matchesRole
  }

  return (
    <div className={styles.navigationList}>
      {MAIN_NAVIGATION_ROUTES.filter(canNavigate).map((route) => (
        <NavLink className={styles.navLink} key={`${route.path}-${route.label}`} onClick={onNavigate} title={route.label} to={route.path}>
          <i className={`bi ${ROUTE_ICONS_BY_PATH[route.path] ?? 'bi-circle'} ${styles.navIcon}`} aria-hidden="true" />
          <span className={styles.navText}>{route.label}</span>
        </NavLink>
      ))}
    </div>
  )
}
